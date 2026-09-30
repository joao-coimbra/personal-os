import { useChat } from "@ai-sdk/react";
import { Bubble, BubbleContent } from "@personal-os/ui/components/bubble";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@personal-os/ui/components/input-group";
import {
  Message,
  MessageContent as MessageBody,
  MessageHeader,
} from "@personal-os/ui/components/message";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@personal-os/ui/components/message-scroller";
import { DefaultChatTransport } from "ai";
import { ArrowUpIcon, Loader2 } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useState,
} from "react";
import { Streamdown } from "streamdown";

import { getApiUrl } from "@/lib/server-url";

function resolveChatErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return null;
}

export function OperatorChat() {
  const [input, setInput] = useState("");
  const { error, messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: getApiUrl("/api/ai"),
      credentials: "include",
    }),
  });
  const isSending = status === "submitted" || status === "streaming";
  const errorMessage = resolveChatErrorMessage(error);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) {
      return;
    }
    sendMessage({ text });
    setInput("");
  };

  const handlePromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <MessageScrollerProvider>
      <div className="flex h-full min-h-0 flex-col">
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="space-y-4 p-4">
              {messages.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Pergunte sobre tarefas, agenda, prioridades ou peça para
                  organizar seu dia.
                </p>
              )}
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <MessageScrollerItem key={message.id}>
                    <Message align={isUser ? "end" : "start"}>
                      <MessageBody>
                        <MessageHeader>
                          {isUser ? "Você" : "PersonalOS AI"}
                        </MessageHeader>
                        <Bubble
                          align={isUser ? "end" : "start"}
                          variant={isUser ? "default" : "secondary"}
                        >
                          <BubbleContent>
                            {message.parts?.map((part, index) => {
                              const partKey = `${message.id}-${part.type}-${index}`;
                              if (part.type === "text") {
                                return (
                                  <Streamdown
                                    isAnimating={
                                      status === "streaming" &&
                                      message.role === "assistant"
                                    }
                                    key={partKey}
                                  >
                                    {part.text}
                                  </Streamdown>
                                );
                              }
                              if (part.type.startsWith("tool-")) {
                                return (
                                  <p
                                    className="text-muted-foreground text-xs"
                                    key={partKey}
                                  >
                                    ✓ Consultando dados conectados…
                                  </p>
                                );
                              }
                              return null;
                            })}
                          </BubbleContent>
                        </Bubble>
                      </MessageBody>
                    </Message>
                  </MessageScrollerItem>
                );
              })}
              {status === "submitted" && (
                <MessageScrollerItem>
                  <Bubble variant="secondary">
                    <BubbleContent className="flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span className="text-sm">Processando…</span>
                    </BubbleContent>
                  </Bubble>
                </MessageScrollerItem>
              )}
              {errorMessage ? (
                <MessageScrollerItem>
                  <Bubble variant="secondary">
                    <BubbleContent>
                      <p className="text-destructive text-sm">{errorMessage}</p>
                    </BubbleContent>
                  </Bubble>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
        {/* biome-ignore lint/performance/noJsxPropsBind: form handlers are instance-local */}
        <form className="border-t p-3" onSubmit={handleSubmit}>
          <InputGroup>
            <InputGroupTextarea
              disabled={isSending}
              // biome-ignore lint/performance/noJsxPropsBind: controlled textarea
              onChange={handleInputChange}
              // biome-ignore lint/performance/noJsxPropsBind: enter-to-submit
              onKeyDown={handlePromptKeyDown}
              placeholder="Mensagem para o operador…"
              rows={2}
              value={input}
            />
            <InputGroupAddon align="block-end" className="pt-1">
              <InputGroupButton
                className="ml-auto"
                disabled={isSending || !input.trim()}
                size="icon-sm"
                type="submit"
                variant="default"
              >
                {isSending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ArrowUpIcon />
                )}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>
    </MessageScrollerProvider>
  );
}
