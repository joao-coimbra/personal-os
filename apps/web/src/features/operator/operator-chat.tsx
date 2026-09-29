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
import { type FormEvent, type KeyboardEvent, useState } from "react";
import { Streamdown } from "streamdown";

import { ENV } from "@/env";

export function OperatorChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${ENV.VITE_SERVER_URL}/ai`,
      credentials: "include",
    }),
  });
  const isSending = status === "submitted" || status === "streaming";

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
                              if (part.type === "text") {
                                return (
                                  <Streamdown
                                    isAnimating={
                                      status === "streaming" &&
                                      message.role === "assistant"
                                    }
                                    key={index}
                                  >
                                    {part.text}
                                  </Streamdown>
                                );
                              }
                              if (part.type.startsWith("tool-")) {
                                return (
                                  <p
                                    className="text-muted-foreground text-xs"
                                    key={index}
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
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
        <form className="border-t p-3" onSubmit={handleSubmit}>
          <InputGroup>
            <InputGroupTextarea
              disabled={isSending}
              onChange={(e) => setInput(e.target.value)}
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
