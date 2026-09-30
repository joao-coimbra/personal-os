import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@personal-os/ui/components/avatar";
import { Button } from "@personal-os/ui/components/button";
import { Separator } from "@personal-os/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@personal-os/ui/components/sheet";
import { Textarea } from "@personal-os/ui/components/textarea";
import { cn } from "@personal-os/ui/lib/utils";
import { Send, Sparkles, X } from "lucide-react";
import {
  type CSSProperties,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AI_REPLIES,
  AI_SUGGESTIONS,
  AI_THREAD,
  type AiMessage,
  USER,
} from "./data";

// ── Breakpoint ──
// Below lg the assistant rides an overlay Sheet; at lg+ it is an in-flow panel.
// The sidebar (250px) plus an in-flow assistant (320px) leaves too little for
// the center column on tablets, so the third surface only joins the row when
// there is room for all three.
const LG_BREAKPOINT = 1024;

function useIsBelowLg() {
  const [below, setBelow] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`);
    const onChange = () => setBelow(window.innerWidth < LG_BREAKPOINT);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!below;
}

// ── Context ──
// At lg+ the assistant is an in-flow panel that pushes the body via a width
// animation; below lg it is a Sheet drawer. Each surface keeps its own open
// state, and one breakpoint-aware trigger drives whichever is active.

type AiAssistantContextType = {
  // Open state of whichever surface the current width uses.
  open: boolean;
  toggle: () => void;
  close: () => void;
  // Surface routing for the render.
  belowLg: boolean;
  inFlowOpen: boolean;
  sheetOpen: boolean;
};

const AiAssistantContext = createContext<AiAssistantContextType>({
  belowLg: false,
  close: () => {},
  inFlowOpen: true,
  open: true,
  sheetOpen: false,
  toggle: () => {},
});

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const belowLg = useIsBelowLg();
  const [inFlowOpen, setInFlowOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const open = belowLg ? sheetOpen : inFlowOpen;
  const toggle = () =>
    belowLg ? setSheetOpen((o) => !o) : setInFlowOpen((o) => !o);
  const close = () => (belowLg ? setSheetOpen(false) : setInFlowOpen(false));

  return (
    <AiAssistantContext.Provider
      value={{ belowLg, close, inFlowOpen, open, sheetOpen, toggle }}
    >
      {children}
    </AiAssistantContext.Provider>
  );
}

export function useAiAssistant() {
  return useContext(AiAssistantContext);
}

// ── Sparkles mark ──

function SparklesMark({ className }: { className?: string }) {
  return <Sparkles aria-hidden="true" className={className} />;
}

// ── Message bubble ──

function MessageBubble({ message }: { message: AiMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-2.5">
        <p className="max-w-[80%] rounded-lg rounded-tr-sm bg-primary px-3 py-2 text-primary-foreground text-sm leading-snug">
          {message.text}
        </p>
        <Avatar className="size-6 shrink-0">
          <AvatarImage alt={USER.name} src={USER.avatar} />
          <AvatarFallback className="text-[10px]">
            {USER.initials}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <SparklesMark className="size-3.5" />
      </span>
      <p className="max-w-[80%] rounded-lg rounded-tl-sm bg-muted px-3 py-2 text-foreground text-sm leading-snug">
        {message.text}
      </p>
    </div>
  );
}

// ── Typing indicator ──

function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <SparklesMark className="size-3.5" />
      </span>
      <div className="flex items-center gap-0.5 rounded-lg rounded-tl-sm bg-muted px-3 py-2">
        <span className="size-1 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
        <span className="size-1 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
        <span className="size-1 animate-bounce rounded-full bg-muted-foreground/50" />
      </div>
    </div>
  );
}

// ── Panel ──

function AiAssistantPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<AiMessage[]>(AI_THREAD);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(AI_THREAD.length);
  const timerRef = useRef<number | null>(null);

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, pending]);

  // Clear a pending reply timer if the panel unmounts (mobile Sheet close).
  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    },
    []
  );

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || pending) {
      return;
    }

    idRef.current += 1;
    setMessages((prev) => [
      ...prev,
      { id: `m${idRef.current}`, role: "user", text },
    ]);
    setInput("");
    setPending(true);

    const reply: string =
      AI_REPLIES[idRef.current % AI_REPLIES.length] ??
      "I can help prioritize your next tasks.";
    timerRef.current = window.setTimeout(() => {
      idRef.current += 1;
      setMessages((prev) => [
        ...prev,
        { id: `m${idRef.current}`, role: "assistant", text: reply },
      ]);
      setPending(false);
    }, 900);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  };

  // Quick prompts only until the visitor starts their own conversation.
  const showSuggestions = messages.length <= AI_THREAD.length && !pending;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <div className="flex h-(--header-height) shrink-0 items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <SparklesMark className="size-3.5" />
          </span>
          <h2 className="font-medium text-sm">AI Assistant</h2>
        </div>
        <Button
          aria-label="Close AI assistant"
          onClick={onClose}
          size="icon-sm"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <Separator />

      {/* Thread */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
        ref={scrollRef}
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {pending && <TypingBubble />}

        {showSuggestions && (
          <div className="space-y-2 pt-1">
            <p className="text-muted-foreground text-xs">Suggested</p>
            <div className="flex flex-wrap gap-2">
              {AI_SUGGESTIONS.map((suggestion) => (
                <Button
                  className="rounded-full font-normal"
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        className="shrink-0 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <div className="relative">
          <Textarea
            aria-label="Message the AI assistant"
            className="min-h-16 resize-none pr-11"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything about your tasks..."
            rows={2}
            value={input}
          />
          <Button
            aria-label="Send message"
            className="absolute right-2 bottom-2"
            disabled={!input.trim() || pending}
            size="icon-sm"
            type="submit"
          >
            <Send aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Assistant surface (lg+ in-flow + below-lg Sheet) ──

export function AiAssistant() {
  const { belowLg, inFlowOpen, sheetOpen, close } = useAiAssistant();

  if (belowLg) {
    return (
      <Sheet onOpenChange={(open) => !open && close()} open={sheetOpen}>
        <SheetContent
          className="w-[300px] p-0 [&>button]:hidden"
          side="right"
          style={
            {
              "--header-height": "56px",
              "--sidebar-width": "300px",
            } as CSSProperties
          }
        >
          <SheetTitle className="sr-only">AI Assistant</SheetTitle>
          <SheetDescription className="sr-only">
            Conversational assistant for your tasks.
          </SheetDescription>
          <AiAssistantPanel onClose={close} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      aria-hidden={!inFlowOpen}
      aria-label="AI assistant"
      className={cn(
        "h-svh shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
        inFlowOpen ? "w-[320px]" : "w-0"
      )}
      inert={!inFlowOpen}
      role="complementary"
    >
      <div className="my-2 me-2 flex h-[calc(100%-1rem)] w-[312px] flex-col overflow-hidden rounded-lg border bg-background shadow-xs">
        <AiAssistantPanel onClose={close} />
      </div>
    </div>
  );
}
