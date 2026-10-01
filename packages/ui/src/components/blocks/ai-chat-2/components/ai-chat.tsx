// @ts-nocheck
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@personal-os/ui/components/avatar";
import { Button } from "@personal-os/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@personal-os/ui/components/sheet";
import { TooltipProvider } from "@personal-os/ui/components/tooltip";
import { cn } from "cn";
import { CheckIcon, FileTextIcon, LinkIcon, SparklesIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AssistantPanel } from "./assistant-panel";
import {
  ASSISTANT_NAME,
  type ChatMessageRecord,
  COLLABORATORS,
  DOC_FILENAME,
  DOC_SHARE_URL,
  type DraftPayload,
  draftReply,
  MODELS,
  THREADS,
  type TranscriptRecord,
} from "./data";
import { ReleaseDoc } from "./release-doc";

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_LINK = <LinkIcon aria-hidden="true" data-icon="inline-start" />;

const ICON_CHECK = <CheckIcon aria-hidden="true" data-icon="inline-start" />;

// Below lg the assistant rides an overlay Sheet; at lg+ it is an in-flow panel.
// A 384px panel beside the document needs about 1024px before both read well.
const LG_QUERY = "(max-width: 1023px)";

function subscribeBelowLg(onChange: () => void) {
  const query = window.matchMedia(LG_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Read straight from matchMedia, so a phone's first paint already gets the
    sheet instead of flashing the desktop dock for a frame. */
function useIsBelowLg() {
  return useSyncExternalStore(
    subscribeBelowLg,
    () => window.matchMedia(LG_QUERY).matches,
    () => false
  );
}

export function AiChat() {
  const belowLg = useIsBelowLg();
  const [dockOpen, setDockOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modelId, setModelId] = useState(MODELS[0].id);
  /** Which saved conversation the panel is showing. */
  const [threadId, setThreadId] = useState(THREADS[0].id);
  const [streaming, setStreaming] = useState(true);
  /** Only a real Stop press earns the "Stopped by you" note; a send that
      interrupts the stream settles the reply complete and unmarked. */
  const [stopped, setStopped] = useState(false);
  /** Replies that were stopped, so the note survives them settling. */
  const [stoppedIds, setStoppedIds] = useState<string[]>([]);
  /** Seeded replies Retry replaced; they cannot be popped from THREADS. */
  const [suppressedIds, setSuppressedIds] = useState<string[]>([]);
  /** New chat parks the panel on its zero state until the next send. */
  const [newChat, setNewChat] = useState(false);
  /** The draft written into the document, or null while the section is empty. */
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [flash, setFlash] = useState(false);
  /** Set for one beat after Share copies the document link. */
  const [shared, setShared] = useState(false);
  /** Turns the visitor adds, on top of the seeded thread. */
  const [sent, setSent] = useState<ChatMessageRecord[]>([]);
  /** Set once the seeded reply has been settled into the message stream. */
  const [committed, setCommitted] = useState(false);
  /** The reply currently typing itself out, so the thread can animate it. */
  const [arrivingId, setArrivingId] = useState<string | null>(null);

  const draftSection = useRef<HTMLElement | null>(null);
  /** Collapse hands focus here before inert makes the panel unfocusable. */
  const assistantToggle = useRef<HTMLButtonElement | null>(null);
  /** Serves reply ids without reading state back out of a dispatch. */
  const replySeq = useRef(0);
  /** Armed by Insert so the scroll waits for the section to actually grow. */
  const scrollQueued = useRef(false);
  const replyTimer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const sharedTimer = useRef<number | null>(null);

  const thread = THREADS.find((item) => item.id === threadId) ?? THREADS[0];
  // A new conversation has no thread yet, so it must not wear the old name.
  const threadTitle = newChat ? ASSISTANT_NAME : thread.title;
  const pending = newChat || committed ? undefined : thread.pending;
  const transcript: TranscriptRecord = newChat
    ? { messages: sent }
    : {
        ...thread,
        messages: [
          ...thread.messages.filter(
            (message) => !suppressedIds.includes(message.id)
          ),
          ...sent,
        ],
        pending,
      };

  const assistantOpen = belowLg ? sheetOpen : dockOpen;
  const showEmpty = newChat && sent.length === 0;

  useEffect(
    () => () => {
      if (replyTimer.current) {
        window.clearTimeout(replyTimer.current);
      }
      if (flashTimer.current) {
        window.clearTimeout(flashTimer.current);
      }
      if (sharedTimer.current) {
        window.clearTimeout(sharedTimer.current);
      }
    },
    []
  );

  // Fired after the section content commits, so Insert never scrolls to where
  // the draft is about to be.
  useEffect(() => {
    if (!(draft && scrollQueued.current)) {
      return;
    }
    scrollQueued.current = false;
    draftSection.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  }, [draft]);

  /** The reveal reports when its last chunk lands, so a long answer runs as
      long as it needs to instead of being cut off by a timer that guessed. */
  function handleArrived() {
    setArrivingId(null);
    setStreaming(false);
  }

  /** A short wait under the marker, then the reply types itself out. */
  function beginReply(prompt: string) {
    if (replyTimer.current) {
      window.clearTimeout(replyTimer.current);
    }
    setStopped(false);
    setArrivingId(null);
    setStreaming(true);
    replyTimer.current = window.setTimeout(() => {
      replyTimer.current = null;
      replySeq.current += 1;
      const replyId = `reply_${replySeq.current}`;
      const reply = draftReply(prompt, replySeq.current - 1);
      setSent((current) => [
        ...current,
        {
          at: "Now",
          draft: reply.draft,
          followUps: reply.followUps,
          id: replyId,
          parts: reply.parts,
          role: "assistant",
        },
      ]);
      setArrivingId(replyId);
    }, 700);
  }

  function handleSend(text: string) {
    const base = sent.length;
    const appended: ChatMessageRecord[] = [];
    let settledId: string | null = null;
    if (pending) {
      // Sending settles the in-flight reply in place, complete unless a real
      // Stop already froze it, so the new turn is genuinely last.
      const finished = !stopped && Boolean(pending.rest);
      settledId = `sent_${base + 1}`;
      appended.push({
        at: pending.at,
        draft: pending.draft,
        followUps: pending.followUps,
        id: settledId,
        parts: finished
          ? pending.parts.map((part, index) =>
              index === pending.parts.length - 1 && part.kind === "text"
                ? { ...part, text: part.text + pending.rest }
                : part
            )
          : pending.parts,
        role: "assistant",
      });
    }
    appended.push({
      at: "Now",
      id: `sent_${base + appended.length + 1}`,
      parts: [{ kind: "text", text }],
      role: "user",
    });
    setSent((current) => [...current, ...appended]);
    if (pending) {
      setCommitted(true);
      if (stopped && settledId) {
        setStoppedIds((current) => [...current, settledId]);
      }
    }
    beginReply(text);
  }

  function resetThread(toNewChat: boolean) {
    if (replyTimer.current) {
      window.clearTimeout(replyTimer.current);
    }
    replyTimer.current = null;
    setSent([]);
    setCommitted(false);
    setArrivingId(null);
    setStopped(false);
    setStreaming(false);
    setStoppedIds([]);
    setSuppressedIds([]);
    setDraft(null);
    setNewChat(toNewChat);
  }

  function openThread(id: string) {
    setThreadId(id);
    resetThread(false);
  }

  /** Replaces the newest reply with a fresh answer to the same question. */
  function handleRetry() {
    const messages = transcript.messages;
    const asked = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    const prompt = asked?.parts
      .map((part) => (part.kind === "text" ? part.text : ""))
      .join(" ")
      .trim();
    if (!prompt) {
      return;
    }

    if (pending) {
      // Settling the seeded reply retires it, leaving the question standing.
      setCommitted(true);
    } else {
      // The trailing assistant run splits: sent turns pop, seeded turns can
      // only be filtered out, or Retry would duplicate them.
      const trailing: ChatMessageRecord[] = [];
      for (
        let index = messages.length - 1;
        index >= 0 && messages[index].role === "assistant";
        index--
      ) {
        trailing.push(messages[index]);
      }
      const sentIds = new Set(sent.map((message) => message.id));
      const dropped = trailing
        .filter((message) => sentIds.has(message.id))
        .map((message) => message.id);
      const seeded = trailing
        .filter((message) => !sentIds.has(message.id))
        .map((message) => message.id);
      if (dropped.length) {
        setSent((current) =>
          current.filter((message) => !dropped.includes(message.id))
        );
      }
      if (seeded.length) {
        setSuppressedIds((current) => [...current, ...seeded]);
      }
    }
    beginReply(prompt);
  }

  /** Hands over the document link, the one share action a draft page needs. */
  function handleShare() {
    navigator.clipboard
      ?.writeText(DOC_SHARE_URL)
      .then(() => {
        setShared(true);
        if (sharedTimer.current) {
          window.clearTimeout(sharedTimer.current);
        }
        sharedTimer.current = window.setTimeout(() => setShared(false), 1600);
      })
      .catch(() => setShared(false));
  }

  /** Writes the offered draft into the document, or takes it back out. */
  function handleToggleDraft(offered: DraftPayload) {
    if (draft) {
      setDraft(null);
      return;
    }
    setDraft(offered);
    scrollQueued.current = true;
    // The sheet covers the document, so it steps aside to show the change land.
    if (belowLg) {
      setSheetOpen(false);
    }
    setFlash(true);
    if (flashTimer.current) {
      window.clearTimeout(flashTimer.current);
    }
    flashTimer.current = window.setTimeout(() => setFlash(false), 1600);
  }

  const panel = (
    <AssistantPanel
      arrivingId={arrivingId}
      drafted={draft !== null}
      modelId={modelId}
      onArrived={handleArrived}
      onClose={() => {
        if (belowLg) {
          setSheetOpen(false);
          return;
        }
        // Focus must leave the panel before inert makes its controls dead.
        assistantToggle.current?.focus();
        setDockOpen(false);
      }}
      onModelChange={setModelId}
      onNewChat={() => resetThread(true)}
      onOpenThread={openThread}
      onRetry={handleRetry}
      onSend={handleSend}
      onStop={() => {
        if (replyTimer.current) {
          window.clearTimeout(replyTimer.current);
        }
        replyTimer.current = null;
        setStopped(true);
        // A stopped sent reply keeps its note after it settles into the thread.
        if (arrivingId) {
          setStoppedIds((current) => [...current, arrivingId]);
        }
        setArrivingId(null);
        setStreaming(false);
      }}
      onToggleDraft={handleToggleDraft}
      overlay={belowLg}
      showEmpty={showEmpty}
      stopped={stopped}
      stoppedIds={stoppedIds}
      streaming={streaming}
      threadTitle={threadTitle}
      transcript={transcript}
    />
  );

  return (
    // Every tooltip in the block needs this ancestor to open.
    <TooltipProvider>
      <div className="flex h-svh w-full flex-col bg-background text-foreground">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <FileTextIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 truncate font-mono text-muted-foreground text-xs">
            {DOC_FILENAME}
          </span>

          <div className="ms-auto flex items-center gap-2">
            <ul
              aria-label="In this draft"
              className="hidden items-center -space-x-2 sm:flex"
            >
              {COLLABORATORS.map((person) => (
                <li key={person.name}>
                  <span className="sr-only">{person.name}</span>
                  <Avatar
                    aria-hidden="true"
                    className="size-6 ring-2 ring-background"
                  >
                    <AvatarImage alt="" src={person.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {person.initials}
                    </AvatarFallback>
                  </Avatar>
                </li>
              ))}
            </ul>

            <Button onClick={handleShare} variant="outline">
              {shared ? ICON_CHECK : ICON_LINK}
              {shared ? "Copied" : "Share"}
            </Button>

            <Button
              aria-pressed={assistantOpen}
              onClick={() =>
                belowLg
                  ? setSheetOpen((open) => !open)
                  : setDockOpen((open) => !open)
              }
              ref={assistantToggle}
              variant="outline"
            >
              <SparklesIcon aria-hidden="true" data-icon="inline-start" />
              <span className="max-sm:sr-only">Assistant</span>
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">
            <ReleaseDoc draft={draft} draftRef={draftSection} flash={flash} />
          </main>

          {/* Only the shell's width animates: the panel inside keeps its 384px
              so nothing inside it reflows while the document makes room. */}
          {belowLg ? null : (
            <div
              aria-hidden={!dockOpen}
              aria-label="Assistant"
              className={cn(
                "shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
                dockOpen ? "w-96 border-s" : "w-0"
              )}
              inert={!dockOpen}
              role="complementary"
            >
              <div className="h-full w-96">{panel}</div>
            </div>
          )}
        </div>
      </div>

      {/* Mounted closed so the first open still plays the sheet transition. */}
      <Sheet onOpenChange={setSheetOpen} open={belowLg && sheetOpen}>
        <SheetContent
          // Full width on a phone: a 384px cap there leaves a few dead
          // pixels of page showing beside the drawer.
          className="w-full p-0 sm:max-w-96"
          initialFocus={false}
          showCloseButton={false}
          side="right"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Assistant</SheetTitle>
            <SheetDescription>Ask about this draft.</SheetDescription>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
