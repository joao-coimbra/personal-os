// @ts-nocheck
"use client";

import {
  Bubble,
  BubbleContent,
  BubbleGroup,
} from "@personal-os/ui/components/bubble";
import { Button } from "@personal-os/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@personal-os/ui/components/empty";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@personal-os/ui/components/marker";
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@personal-os/ui/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScrollerScrollable,
} from "@personal-os/ui/components/message-scroller";
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockDownloadButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@personal-os/ui/components/reui/code-block/code-block";
import { highlightCode } from "@personal-os/ui/components/reui/code-block/code-block-highlight";
import { IconStack } from "@personal-os/ui/components/reui/icon-stack";
import { ScrollArea, ScrollBar } from "@personal-os/ui/components/scroll-area";
import { Spinner } from "@personal-os/ui/components/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@personal-os/ui/components/tooltip";
import {
  CheckIcon,
  CopyIcon,
  CornerDownLeftIcon,
  CornerDownRightIcon,
  MessageSquareIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SparklesIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { memo, type ReactNode, useEffect, useRef, useState } from "react";
import {
  ASSISTANT_NAME,
  type ChatMessageRecord,
  DOC_SECTIONS,
  DRAFT_SECTION_ID,
  type DraftPayload,
  type MessagePart,
  STARTERS,
  type ThreadRecord,
  type TranscriptRecord,
  VIEWER,
} from "./data";

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_COPY = <CopyIcon aria-hidden="true" />;

const ICON_LIKE = <ThumbsUpIcon aria-hidden="true" />;

const ICON_DISLIKE = <ThumbsDownIcon aria-hidden="true" />;

const ICON_RETRY = <RefreshCwIcon aria-hidden="true" />;

const ICON_CHECK = <CheckIcon aria-hidden="true" />;

const ICON_INSERT = <PlusIcon aria-hidden="true" />;

const ICON_UNDO = <RotateCcwIcon aria-hidden="true" />;

const ICON_SUGGEST = (
  <CornerDownRightIcon
    aria-hidden="true"
    className="size-3.5 shrink-0 opacity-50"
  />
);

const DRAFT_SECTION_HEADING =
  DOC_SECTIONS.find((section) => section.id === DRAFT_SECTION_ID)?.heading ??
  "";

function CodeArtifact({
  part,
  streaming = false,
}: {
  part: Extract<MessagePart, { kind: "code" }>;
  streaming?: boolean;
}) {
  return (
    // w-full fills the thread column; the var clamp keeps the streaming row
    // entrance opacity-only, since the transcript kit forbids transforms.
    <CodeBlock
      className="w-full min-w-0 **:data-[slot=code-block-line]:[--tw-enter-translate-y:0]!"
      code={part.code}
      language={part.language}
      streaming={streaming}
    >
      {part.filename ? (
        <CodeBlockHeader>
          <CodeBlockTitle className="truncate">{part.filename}</CodeBlockTitle>
          <div className="ms-auto flex items-center gap-0.5">
            {/* The tooltip rides a wrapper span: rendered AS the button, the
                merged onClick overwrites the primitive's and the control dies. */}
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                {/* A named snippet in this panel IS the .md the reader is
                    editing, so disk is a real next step beside the clipboard. */}
                <CodeBlockDownloadButton
                  filename={
                    part.filename.includes(".") ? part.filename : undefined
                  }
                  label="Download file"
                />
              </TooltipTrigger>
              <TooltipContent>Download file</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <CodeBlockCopyButton />
              </TooltipTrigger>
              <TooltipContent>Copy code</TooltipContent>
            </Tooltip>
          </div>
        </CodeBlockHeader>
      ) : (
        // Headerless: the button pins over the surface, so it needs its own
        // backdrop or line 1 scrolls through it.
        <CodeBlockCopyButton
          className="bg-card hover:bg-muted"
          size="icon-sm"
          variant="outline"
        />
      )}
      {/* The cap goes on the VIEWPORT, not the root: the viewport is height 100%
          of the root, so a root-level cap clips without ever scrolling. */}
      <ScrollArea className="rounded-(--code-block-radius) **:data-[slot=scroll-area-viewport]:max-h-72">
        <CodeBlockContent />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </CodeBlock>
  );
}

/** One reveal tick. 50ms, not a frame: each tick grows the transcript and pays
    for a resize observation plus an autoscroll, so fewer, bigger chunks win. */
const TICK_MS = 50;
/** Pause between parts, in ticks, so they land one at a time. */
const GAP_TICKS = 3;
/** Code reveals faster than prose: it is skimmed, not read as it lands. */
const CODE_SPEEDUP = 2;
/** Visible steps a snippet arrives in, whatever its length. */
const CODE_PASSES = 24;
/** Reading pace plus a floor and cap: ~1.5s for a short reply, ~5.4s max. */
const CHARS_PER_TICK = 27;
const MIN_TICKS = 29;
const MAX_TICKS = 108;

function partCost(part: MessagePart) {
  return part.kind === "text"
    ? part.text.length
    : Math.ceil(part.code.length / CODE_SPEEDUP);
}

/** One character rate for the whole reply, so a long answer takes longer than
    a short one without ever dragging. */
function revealRate(parts: MessagePart[]) {
  const typed = parts.reduce((total, part) => total + partCost(part), 0);
  const ticks = Math.min(
    MAX_TICKS,
    Math.max(MIN_TICKS, Math.round(typed / CHARS_PER_TICK))
  );
  return Math.max(2, Math.ceil(typed / ticks));
}

type RevealedPart = {
  part: MessagePart;
  /** Trails the live text, so the reader can see where the reply is. */
  caret: boolean;
  /** Hands a growing snippet to the code block's own streaming treatment. */
  streaming: boolean;
};

/** Walks the reply and cuts it at the revealed character. Code lands a line at
    a time: a character slice would re-highlight the whole snippet every tick. */
function sliceReply(
  parts: MessagePart[],
  revealed: number,
  rate: number
): RevealedPart[] {
  const gap = rate * GAP_TICKS;
  const shown: RevealedPart[] = [];
  let start = 0;

  for (const part of parts) {
    const local = revealed - start;
    if (local <= 0) {
      break;
    }

    const cost = partCost(part);
    if (local >= cost) {
      shown.push({ caret: false, part, streaming: false });
      start += cost + gap;
      continue;
    }

    if (part.kind === "text") {
      shown.push({
        caret: true,
        part: { ...part, text: part.text.slice(0, local) },
        streaming: false,
      });
    } else {
      const chars = local * CODE_SPEEDUP;
      const lines = part.code.split("\n");
      const step = Math.max(1, Math.ceil(lines.length / CODE_PASSES));
      const reached = Math.floor((chars / part.code.length) * lines.length);
      const settled = Math.floor(reached / step) * step;
      shown.push({
        caret: false,
        part: {
          ...part,
          // The opening line types before the first group lands, so the block
          // never sits there as an empty box.
          code: settled
            ? lines.slice(0, settled).join("\n") + "\n"
            : part.code.slice(0, chars),
        },
        streaming: true,
      });
    }
    return shown;
  }

  // Between parts the caret stays on the last text line, so the reply reads as
  // still running; a finished reply never keeps one.
  const last = shown[shown.length - 1];
  if (shown.length < parts.length && last?.part.kind === "text") {
    last.caret = true;
  }
  return shown;
}

/** Streams a reply in part order; instant under reduced motion. `frozen`
    keeps whatever a Stop already showed instead of handing back the rest. */
function useRevealedReply(
  parts: MessagePart[],
  {
    active,
    frozen,
    onDone,
  }: { active: boolean; frozen: boolean; onDone?: () => void }
) {
  const rate = revealRate(parts);
  const gap = rate * GAP_TICKS;
  const total = parts.reduce(
    (sum, part, index) =>
      sum + partCost(part) + (index < parts.length - 1 ? gap : 0),
    0
  );

  const [revealed, setRevealed] = useState(active ? rate : total);
  // The parent re-creates this on every render; the effect must not restart on it.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (frozen) {
      return;
    }
    if (!active) {
      setRevealed(total);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(total);
      return;
    }
    // Starts on the first chunk rather than on nothing, so a reply never opens
    // with an empty bubble.
    setRevealed(rate);
    const timer = window.setInterval(() => {
      setRevealed((current) => Math.min(total, current + rate));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [active, frozen, rate, total]);

  // Reported rather than timed: only the reveal knows when the last chunk lands.
  useEffect(() => {
    if (!active || frozen || revealed < total) {
      return;
    }
    doneRef.current?.();
  }, [active, frozen, revealed, total]);

  return sliceReply(parts, revealed, rate);
}

/** True when a re-render would draw exactly what is already on screen. */
function samePart(a: MessagePart, b: MessagePart) {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "text") {
    return a.text === (b as typeof a).text;
  }
  return a.code === (b as typeof a).code;
}

/** Compared by content, not identity: the reveal hands every part a fresh
    object per tick, so a referential memo would re-render the snippet 20x/s. */
const PartBody = memo(
  function PartBody({
    part,
    caret,
    streaming,
  }: {
    part: MessagePart;
    caret?: boolean;
    streaming?: boolean;
  }) {
    if (part.kind === "code") {
      return <CodeArtifact part={part} streaming={streaming} />;
    }

    // Split on the lone backtick, not a closed pair: mid stream the closing
    // one has not arrived, and it must never surface as a character.
    const segments = part.text.split("`");

    return (
      <p className="whitespace-pre-wrap">
        {segments.map((segment, index) =>
          index % 2 === 1 ? (
            <code
              className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]"
              key={index}
            >
              {segment}
            </code>
          ) : (
            segment
          )
        )}
        {/* The caret rides inside the last paragraph so it trails the final word
            instead of blocking onto its own line. */}
        {caret ? (
          <span
            aria-hidden="true"
            className="ms-0.5 inline-block h-[1em] w-0.5 translate-y-0.5 bg-foreground"
          />
        ) : null}
      </p>
    );
  },
  (previous, next) =>
    previous.caret === next.caret &&
    previous.streaming === next.streaming &&
    samePart(previous.part, next.part)
);

function TurnAction({
  label,
  icon,
  pressed,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  /** Set only on real toggles; Copy and Retry are plain buttons. */
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={pressed}
      className={pressed ? "text-primary" : undefined}
      onClick={onClick}
      size="icon-xs"
      variant="ghost"
    >
      {icon}
    </Button>
  );
}

/** Flattens a turn back to plain text, so Copy hands over what was read. */
function turnText(messages: ChatMessageRecord[]) {
  return messages
    .flatMap((message) =>
      message.parts.map((part) =>
        part.kind === "code" ? part.code : part.text
      )
    )
    .join("\n\n")
    .trim();
}

function CopyAction({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
      }
    },
    []
  );

  return (
    <TurnAction
      icon={copied ? ICON_CHECK : ICON_COPY}
      label={copied ? "Copied" : label}
      onClick={() => {
        // Clipboard access is denied on an unfocused document, so the
        // confirmation waits for the write instead of claiming it.
        navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true);
            if (timer.current) {
              window.clearTimeout(timer.current);
            }
            timer.current = window.setTimeout(() => setCopied(false), 1400);
          })
          .catch(() => setCopied(false));
      }}
    />
  );
}

/** The control that makes a docked panel worth docking: it writes the reply
    into the document instead of leaving the reader to copy it across. */
function DraftAction({
  drafted,
  onToggle,
}: {
  drafted: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Button
        onClick={onToggle}
        size="sm"
        variant={drafted ? "ghost" : "outline"}
      >
        {drafted ? ICON_UNDO : ICON_INSERT}
        {drafted ? "Undo" : "Insert"}
      </Button>
      <span className="text-muted-foreground text-xs">
        {drafted ? "Added to" : "Fills"} {DRAFT_SECTION_HEADING}
      </span>
    </div>
  );
}

/** One reply. Owns its own reveal, so only the arriving bubble animates. */
function ReplyBubble({
  parts,
  streaming,
  frozen,
  onDone,
  children,
}: {
  parts: MessagePart[];
  streaming: boolean;
  frozen: boolean;
  onDone?: () => void;
  children?: ReactNode;
}) {
  const shown = useRevealedReply(parts, { active: streaming, frozen, onDone });

  return (
    <Bubble className="w-full min-w-0" variant="ghost">
      <BubbleContent className="min-w-0 space-y-3">
        {shown.map((item, index) => (
          <PartBody
            caret={item.caret}
            key={index}
            part={item.part}
            streaming={item.streaming}
          />
        ))}
        {children}
      </BubbleContent>
    </Bubble>
  );
}

function AssistantTurn({
  messages,
  streaming = false,
  stopped = false,
  drafted,
  draftMessageId,
  onToggleDraft,
  onRetry,
  onDone,
}: {
  messages: ChatMessageRecord[];
  streaming?: boolean;
  stopped?: boolean;
  drafted: boolean;
  /** Only the newest offer is live, so an older draft cannot fight it. */
  draftMessageId: string | null;
  onToggleDraft: (draft: DraftPayload) => void;
  /** Passed only to the newest reply, the only one worth asking again. */
  onRetry?: () => void;
  /** Reported by the reveal when its last chunk lands. */
  onDone?: () => void;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const last = messages[messages.length - 1];

  return (
    <Message aria-label={ASSISTANT_NAME} className="group/turn" role="group">
      <MessageContent className="min-w-0 gap-1">
        <BubbleGroup className="gap-4">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1;
            return (
              <ReplyBubble
                frozen={stopped && isLast}
                key={message.id}
                onDone={isLast ? onDone : undefined}
                parts={message.parts}
                streaming={streaming && isLast}
              >
                {/* Only offered once the reply has finished arriving: half a
                    draft is not worth writing into the document. */}
                {message.id === draftMessageId &&
                message.draft &&
                !streaming ? (
                  <DraftAction
                    drafted={drafted}
                    onToggle={() =>
                      onToggleDraft(message.draft as DraftPayload)
                    }
                  />
                ) : null}
              </ReplyBubble>
            );
          })}
        </BubbleGroup>

        {streaming ? null : (
          <MessageFooter className="gap-0.5">
            {stopped ? (
              <span className="pe-1 text-muted-foreground text-xs">
                Stopped by you
              </span>
            ) : null}
            {/* Time and actions share one reveal, and the row keeps its space
                so nothing shifts when it fades in. */}
            <span className="pointer-events-none flex items-center gap-0.5 opacity-0 transition-opacity focus-within:pointer-events-auto focus-within:opacity-100 group-hover/turn:pointer-events-auto group-hover/turn:opacity-100 max-md:pointer-events-auto max-md:opacity-100">
              <span className="pe-1 text-muted-foreground text-xs tabular-nums">
                {last.at}
              </span>
              <CopyAction label="Copy reply" text={turnText(messages)} />
              <TurnAction
                icon={ICON_LIKE}
                label={vote === "up" ? "Remove like" : "Like reply"}
                onClick={() => setVote(vote === "up" ? null : "up")}
                pressed={vote === "up"}
              />
              <TurnAction
                icon={ICON_DISLIKE}
                label={vote === "down" ? "Remove dislike" : "Dislike reply"}
                onClick={() => setVote(vote === "down" ? null : "down")}
                pressed={vote === "down"}
              />
              {onRetry ? (
                <TurnAction
                  icon={ICON_RETRY}
                  label="Retry reply"
                  onClick={onRetry}
                />
              ) : null}
            </span>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}

function UserTurn({ messages }: { messages: ChatMessageRecord[] }) {
  const last = messages[messages.length - 1];

  return (
    <Message
      align="end"
      aria-label={VIEWER.name}
      className="group/turn"
      role="group"
    >
      <MessageContent className="min-w-0 gap-1">
        {/* Consecutive sends stack as one turn, the way a real thread reads. */}
        <BubbleGroup className="w-full items-end gap-2">
          {messages.map((message) => (
            <Bubble
              align="end"
              className="max-w-[85%]"
              key={message.id}
              variant="muted"
            >
              <BubbleContent className="space-y-2">
                {message.parts.map((part, index) => (
                  <PartBody key={index} part={part} />
                ))}
              </BubbleContent>
            </Bubble>
          ))}
        </BubbleGroup>

        <MessageFooter className="gap-0.5">
          <span className="pointer-events-none flex items-center gap-0.5 opacity-0 transition-opacity focus-within:pointer-events-auto focus-within:opacity-100 group-hover/turn:pointer-events-auto group-hover/turn:opacity-100 max-md:pointer-events-auto max-md:opacity-100">
            <span className="pe-1 text-muted-foreground text-xs tabular-nums">
              {last.at}
            </span>
            <CopyAction label="Copy message" text={turnText(messages)} />
          </span>
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}

/** Consecutive turns from the same speaker render as one block. */
function groupTurns(messages: ChatMessageRecord[]) {
  const groups: ChatMessageRecord[][] = [];
  for (const message of messages) {
    const last = groups[groups.length - 1];
    if (last && last[0].role === message.role) {
      last.push(message);
      continue;
    }
    groups.push([message]);
  }
  return groups;
}

export function ChatEmpty({
  threads,
  onStart,
  onOpenThread,
}: {
  threads: ThreadRecord[];
  onStart: (text: string) => void;
  onOpenThread: (id: string) => void;
}) {
  return (
    // Centred while it fits, scrollable once three recent threads outgrow a
    // short panel. `m-auto` centres without clipping the way justify-center does.
    <div className="scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-6">
      <div className="m-auto flex w-full flex-col gap-6">
        <Empty className="flex-none p-0">
          <EmptyHeader>
            <EmptyMedia className="mb-0">
              <IconStack aria-hidden="true" className="h-16 w-14">
                <SparklesIcon
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth="1.9"
                />
              </IconStack>
            </EmptyMedia>
            <EmptyTitle>New Chat</EmptyTitle>
            <EmptyDescription>
              Reading {DOC_SECTIONS.length} sections of this draft.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>

        <div className="flex flex-col">
          {STARTERS.map((prompt) => (
            <Button
              className="group/prompt h-auto w-full justify-start gap-3 whitespace-normal rounded-none border-border border-x-0 border-t-0 border-b px-0 py-2.5 text-start font-normal text-muted-foreground text-sm last:border-b-0 hover:bg-transparent hover:text-foreground"
              key={prompt}
              onClick={() => onStart(prompt)}
              variant="ghost"
            >
              <span className="min-w-0 flex-1">{prompt}</span>
              <CornerDownLeftIcon
                aria-hidden="true"
                className="size-4 shrink-0 opacity-40 transition-opacity group-hover/prompt:opacity-100"
              />
            </Button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-muted-foreground text-xs">Recent</p>
          <ul className="flex flex-col gap-1">
            {threads.map((thread) => (
              <li key={thread.id}>
                <Button
                  className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-start font-normal"
                  onClick={() => onOpenThread(thread.id)}
                  variant="ghost"
                >
                  <MessageSquareIcon
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {thread.title}
                  </span>
                  <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    {thread.at}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Softens whichever edge has more thread behind it, and only that edge. */
function ScrollFades() {
  const { start, end } = useMessageScrollerScrollable();

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-linear-to-b from-background to-transparent opacity-0 transition-opacity duration-200 ease-out data-[active=true]:opacity-100 motion-reduce:transition-none"
        data-active={start}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-background to-transparent opacity-0 transition-opacity duration-200 ease-out data-[active=true]:opacity-100 motion-reduce:transition-none"
        data-active={end}
      />
    </>
  );
}

export function ChatThread({
  transcript,
  streaming,
  stopped,
  stoppedIds,
  arrivingId,
  drafted,
  onToggleDraft,
  onSend,
  onRetry,
  onArrived,
}: {
  transcript: TranscriptRecord;
  streaming: boolean;
  stopped: boolean;
  /** Settled replies that were stopped, so their note is not lost. */
  stoppedIds: string[];
  arrivingId: string | null;
  drafted: boolean;
  onToggleDraft: (draft: DraftPayload) => void;
  onSend: (text: string) => void;
  onRetry: () => void;
  /** Fired once by the reveal when the arriving reply finishes typing. */
  onArrived: () => void;
}) {
  const { messages, pending, separator } = transcript;

  // The boot reply streams a markdown snippet right away, so the grammar and
  // themes warm on mount or the first lines land uncoloured.
  useEffect(() => {
    void highlightCode("## ready", { language: "markdown" });
  }, []);

  // The newest reply that offers the draft owns the control; older offers go
  // quiet so two buttons never toggle the same section.
  const draftMessageId =
    (pending?.draft ? "pending" : null) ??
    [...messages].reverse().find((message) => message.draft)?.id ??
    null;

  // A run that finished delivers its closing clause; a stopped one keeps only
  // the text it had already produced.
  const tail =
    pending && !streaming && !stopped && pending.rest
      ? pending.parts.map((part, index) =>
          index === pending.parts.length - 1 && part.kind === "text"
            ? { ...part, text: part.text + pending.rest }
            : part
        )
      : pending?.parts;

  // Only the newest reply's suggestions are live, so a stale chip never offers
  // a follow up to a turn two answers back.
  const newestReply =
    pending ??
    [...messages].reverse().find((message) => message.role === "assistant");
  const followUps = streaming ? [] : (newestReply?.followUps ?? []);

  // Asking again only makes sense for the answer that is actually last.
  const newestReplyId = pending
    ? "pending"
    : ([...messages].reverse().find((m) => m.role === "assistant")?.id ?? null);

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className="scrollbar">
          <MessageScrollerContent
            aria-busy={streaming}
            className="flex w-full min-w-0 flex-col gap-5 px-3 py-4"
          >
            {separator ? (
              <MessageScrollerItem
                className="[content-visibility:visible]"
                scrollAnchor={false}
              >
                <Marker variant="separator">
                  <MarkerContent>{separator}</MarkerContent>
                </Marker>
              </MessageScrollerItem>
            ) : null}

            {groupTurns(messages).map((group) => {
              const arriving = group.some(
                (message) => message.id === arrivingId
              );
              return (
                <MessageScrollerItem
                  className="fade-in-0 animate-in duration-300 ease-out [content-visibility:visible] motion-reduce:animate-none"
                  key={group[0].id}
                  messageId={group[group.length - 1].id}
                  // The full page shell anchors a sent turn to the top of the
                  // reply; a 630px panel would strand the reply below the fold.
                  scrollAnchor={false}
                >
                  {group[0].role === "user" ? (
                    <UserTurn messages={group} />
                  ) : (
                    <AssistantTurn
                      drafted={drafted}
                      draftMessageId={draftMessageId}
                      messages={group}
                      onDone={arriving ? onArrived : undefined}
                      onRetry={
                        group.some((m) => m.id === newestReplyId)
                          ? onRetry
                          : undefined
                      }
                      onToggleDraft={onToggleDraft}
                      stopped={group.some((m) => stoppedIds.includes(m.id))}
                      streaming={arriving}
                    />
                  )}
                </MessageScrollerItem>
              );
            })}

            {pending ? (
              <MessageScrollerItem
                className="[content-visibility:visible]"
                messageId="pending"
                scrollAnchor={false}
              >
                <AssistantTurn
                  drafted={drafted}
                  draftMessageId={draftMessageId}
                  messages={[
                    {
                      at: pending.at,
                      draft: pending.draft,
                      followUps: pending.followUps,
                      id: "pending",
                      parts: tail ?? pending.parts,
                      role: "assistant",
                    },
                  ]}
                  onDone={onArrived}
                  onRetry={onRetry}
                  onToggleDraft={onToggleDraft}
                  stopped={stopped}
                  streaming={streaming}
                />
              </MessageScrollerItem>
            ) : null}

            {/* Waiting only: the moment a reply is typing, the caret owns the
                live tail and the marker must be gone. */}
            {streaming && !arrivingId && !pending ? (
              <MessageScrollerItem
                className="[content-visibility:visible]"
                scrollAnchor={false}
              >
                <Marker>
                  <MarkerIcon>
                    <Spinner />
                  </MarkerIcon>
                  <MarkerContent className="shimmer">
                    Reading the draft
                  </MarkerContent>
                </Marker>
              </MessageScrollerItem>
            ) : null}

            {/* Follow ups sit where the next turn would, so the thread keeps
                reading downward instead of sprouting a toolbar. */}
            {followUps.length ? (
              <MessageScrollerItem
                className="[content-visibility:visible]"
                scrollAnchor={false}
              >
                <div
                  aria-label="Suggested replies"
                  className="flex flex-col items-end gap-2"
                  role="group"
                >
                  {followUps.map((text) => (
                    // Outline, not tinted: a filled chip in the user column is
                    // a pixel off the muted bubble and reads as already sent.
                    <Bubble align="end" key={text} variant="outline">
                      <BubbleContent
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        render={
                          <button onClick={() => onSend(text)} type="button" />
                        }
                      >
                        {text}
                        {ICON_SUGGEST}
                      </BubbleContent>
                    </Bubble>
                  ))}
                </div>
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>

        <ScrollFades />

        {/* aria-busy silences the log, so the in-flight step is announced from
            outside it rather than not at all. */}
        <p aria-live="polite" className="sr-only" role="status">
          {streaming ? (pending?.activityLabel ?? "Reading the draft") : ""}
        </p>

        <MessageScrollerButton
          className="bottom-3 rounded-full shadow-sm"
          size="icon-sm"
          variant="outline"
        />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
