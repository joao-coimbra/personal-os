import { Button } from "@personal-os/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@personal-os/ui/components/dropdown-menu";
import { FieldLabel } from "@personal-os/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@personal-os/ui/components/input-group";
import { Kbd } from "@personal-os/ui/components/kbd";
import { Badge } from "@personal-os/ui/components/reui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@personal-os/ui/components/tooltip";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  FileTextIcon,
  MessageSquareIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import {
  ASSISTANT_NAME,
  CONTEXT_SOURCES,
  type ContextSource,
  MODELS,
} from "./data";

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_SECTION = <FileTextIcon aria-hidden="true" />;

const ICON_THREAD = <MessageSquareIcon aria-hidden="true" />;

const ICON_REMOVE = <XIcon aria-hidden="true" />;

export function Composer({
  streaming,
  modelId,
  onModelChange,
  onSend,
  onStop,
}: {
  streaming: boolean;
  modelId: string;
  onModelChange: (id: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  /** Context rides with the message it was attached to, then clears. */
  const [attached, setAttached] = useState<ContextSource[]>([]);
  const canSend = value.trim().length > 0;
  const box = useRef<HTMLTextAreaElement>(null);
  const activeModel = MODELS.find((model) => model.id === modelId) ?? MODELS[0];

  function send() {
    // The send control never disables, so an empty press puts the caret back
    // in the box rather than doing nothing at all.
    if (!canSend) {
      box.current?.focus();
      return;
    }
    const text = value.trim();
    setValue("");
    setAttached([]);
    onSend(text);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter breaks the line. An IME candidate window also
    // fires Enter, and committing a word there must not post the message.
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    send();
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 px-3 pt-1 pb-3">
      <form onSubmit={submit}>
        <FieldLabel className="sr-only" htmlFor="ai-chat-2-composer">
          Message {ASSISTANT_NAME}
        </FieldLabel>

        <InputGroup>
          {/* Attached context rides above the text, where an editor copilot
              puts it, so the reader sees the scope before they type. */}
          {attached.length ? (
            <InputGroupAddon align="block-start" className="flex-wrap gap-1">
              {/* Outline, not filled: attached context is scope, not a status,
                  and a tint here competes with the send button. */}
              {attached.map((source) => (
                <Badge
                  className="min-w-0 gap-1 pe-0.5 text-muted-foreground"
                  key={source.id}
                  variant="outline"
                >
                  {source.kind === "section" ? ICON_SECTION : ICON_THREAD}
                  <span className="min-w-0 max-w-40 truncate">
                    {source.label}
                  </span>
                  <Button
                    aria-label={`Remove ${source.label}`}
                    className="size-4 rounded-full [&_svg]:size-3"
                    onClick={() =>
                      setAttached((current) =>
                        current.filter((item) => item.id !== source.id)
                      )
                    }
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    {ICON_REMOVE}
                  </Button>
                </Badge>
              ))}
            </InputGroupAddon>
          ) : null}

          <InputGroupTextarea
            // Starts one line and grows with the text, capped so the transcript
            // never loses the panel.
            className="field-sizing-content max-h-32 min-h-10"
            id="ai-chat-2-composer"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this draft..."
            ref={box}
            value={value}
          />

          <InputGroupAddon align="block-end" className="gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <InputGroupButton aria-label="Add context" size="icon-sm" />
                }
              >
                <PlusIcon aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-60 [&_[data-slot=dropdown-menu-item]]:gap-3 [&_[data-slot=dropdown-menu-item]]:py-2"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Add context</DropdownMenuLabel>
                  {/* Attaching disables the source rather than listing it
                      twice; the chip above the text is the receipt. */}
                  {CONTEXT_SOURCES.map((source) => (
                    <DropdownMenuItem
                      disabled={attached.some((item) => item.id === source.id)}
                      key={source.id}
                      onClick={() =>
                        setAttached((current) => [...current, source])
                      }
                    >
                      {source.kind === "section" ? ICON_SECTION : ICON_THREAD}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{source.label}</span>
                        <span className="text-muted-foreground text-xs">
                          {source.hint}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* The panel has no header room for a picker, so the model sits
                where the message is written, the way an editor copilot does. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <InputGroupButton
                    aria-label={`Model, ${activeModel.name}`}
                    className="min-w-0 font-normal"
                    size="sm"
                  />
                }
              >
                <span className="truncate">{activeModel.name}</span>
                <ChevronDownIcon aria-hidden="true" data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-0">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2.5 pt-2.5 pb-1 font-normal text-muted-foreground text-xs">
                    Model
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  className="px-1.5 pb-1.5"
                  onValueChange={(next) => next && onModelChange(next)}
                  value={modelId}
                >
                  {MODELS.map((model) => (
                    // Base UI defaults a radio item to closeOnClick false, so
                    // without this the menu hangs open over the composer.
                    <DropdownMenuRadioItem
                      className="items-start gap-2 py-1.5"
                      closeOnClick
                      key={model.id}
                      value={model.id}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate font-medium text-sm/5">
                            {model.name}
                          </span>
                          {model.recommended ? (
                            <Badge size="sm" variant="primary-light">
                              Default
                            </Badge>
                          ) : null}
                        </span>
                        <span className="truncate text-[11px]/4 text-muted-foreground">
                          {model.provider}
                          <span
                            aria-hidden="true"
                            className="mx-1.5 inline-block size-1 rounded-full bg-muted-foreground/40 align-middle"
                          />
                          <span className="tabular-nums">{model.context}</span>{" "}
                          context
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Stop replaces send while a reply streams, so one slot always
                holds the primary action. */}
            <div className="ms-auto flex items-center gap-1">
              {streaming ? (
                <InputGroupButton onClick={onStop} size="sm" variant="outline">
                  Stop
                </InputGroupButton>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <InputGroupButton
                        aria-label="Send message"
                        size="icon-sm"
                        type="submit"
                        variant="default"
                      />
                    }
                  >
                    <ArrowUpIcon aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-1.5">
                    Send
                    <Kbd>Enter</Kbd>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </InputGroupAddon>
        </InputGroup>
      </form>

      <p className="text-center text-[11px] text-muted-foreground">
        {ASSISTANT_NAME} can make mistakes. Check important info.
      </p>
    </div>
  );
}
