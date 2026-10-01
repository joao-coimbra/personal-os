/** Operator chat adapts ReUI AssistantPanel over PersonalOS /api/ai streaming. */
// biome-ignore-all lint/performance/noJsxPropsBind: AssistantPanel adapters over useChat
"use client";

import { useChat } from "@ai-sdk/react";
import { AssistantPanel } from "@personal-os/ui/components/blocks/ai-chat-2/components/assistant-panel";
import {
  ASSISTANT_NAME,
  type ChatMessageRecord,
  type DraftPayload,
  type MessagePart,
  type TranscriptRecord,
} from "@personal-os/ui/components/blocks/ai-chat-2/components/data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useState } from "react";

const TRAILING_NEWLINE_RE = /\n$/;

import { getApiUrl } from "@/lib/server-url";
import { useUiStore } from "@/stores/ui-store";
import { client, orpc } from "@/utils/orpc";

type PreferredAi = "anthropic" | "openai" | null;

const CODE_FENCE_RE = /```([\w+-]*)\n?([\s\S]*?)```/g;
const CODE_STRIP_RE = /```[\s\S]*?```/g;
const PARAGRAPH_SPLIT_RE = /\n{2,}/;

const NETWORK_ERROR_RE =
  /network error|failed to fetch|fetch failed|load failed|err_network|econnrefused/i;
const CALENDAR_ERROR_RE = /calendar|403|calendar_disabled/i;
const CALENDAR_DETAIL_RE = /indispon|403|disabled|permiss/i;

function messageText(message: UIMessage): string {
  return (message.parts ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
    .trim();
}

function textToParts(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  CODE_FENCE_RE.lastIndex = 0;
  let last = 0;
  let match = CODE_FENCE_RE.exec(text);
  while (match) {
    const before = text.slice(last, match.index).trim();
    if (before) {
      parts.push({ kind: "text", text: before });
    }
    const language = match[1] || "text";
    parts.push({
      code: match[2].replace(TRAILING_NEWLINE_RE, ""),
      filename:
        language === "markdown" || language === "md" ? "draft.md" : undefined,
      kind: "code",
      language,
    });
    last = match.index + match[0].length;
    match = CODE_FENCE_RE.exec(text);
  }
  const rest = text.slice(last).trim();
  if (rest) {
    parts.push({ kind: "text", text: rest });
  }
  if (parts.length === 0) {
    parts.push({ kind: "text", text: text || "…" });
  }
  return parts;
}

function textToDraft(text: string): DraftPayload {
  const withoutCode = text.replace(CODE_STRIP_RE, "").trim();
  const paragraphs = (withoutCode || text)
    .split(PARAGRAPH_SPLIT_RE)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    heading: "Rascunho do operador",
    paragraphs: paragraphs.length > 0 ? paragraphs : [text.trim() || ""],
  };
}

function toChatRecords(messages: UIMessage[]): ChatMessageRecord[] {
  const records: ChatMessageRecord[] = [];
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") {
      continue;
    }
    const text = messageText(message);
    const toolParts = (message.parts ?? []).filter((part) =>
      part.type.startsWith("tool-")
    );
    const parts = textToParts(text);
    if (toolParts.length > 0 && message.role === "assistant" && !text) {
      parts.unshift({
        kind: "text",
        text: "Consultando dados conectados…",
      });
    }
    records.push({
      at: "Agora",
      draft:
        message.role === "assistant" && text.trim().length > 0
          ? textToDraft(text)
          : undefined,
      id: message.id,
      parts,
      role: message.role,
    });
  }
  return records;
}

function resolveChatErrorMessage(error: unknown): string | null {
  let raw: string | null = null;
  if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === "string") {
    raw = error;
  }
  if (!raw) {
    return null;
  }
  if (NETWORK_ERROR_RE.test(raw)) {
    return "Falha de conexão com o operador. A API pode ter caído no meio da resposta (às vezes após consultar Calendar/Trello). Tente de novo — se o Calendar estiver em 403, o operador deve avisar e continuar com notas/tarefas.";
  }
  if (CALENDAR_ERROR_RE.test(raw) && CALENDAR_DETAIL_RE.test(raw)) {
    return raw;
  }
  return raw;
}

export function OperatorChat({
  onClose,
  overlay = false,
}: {
  onClose?: () => void;
  overlay?: boolean;
}) {
  const closeOperator = useUiStore((s) => s.closeOperator);
  const operatorDraft = useUiStore((s) => s.operatorDraft);
  const setOperatorDraft = useUiStore((s) => s.setOperatorDraft);
  const queryClient = useQueryClient();
  const prefs = useQuery(orpc.preferences.get.queryOptions());
  const [localModelId, setLocalModelId] = useState<string | null>(null);

  const setPreferred = useMutation({
    mutationFn: (preferredAiProvider: PreferredAi) =>
      client.preferences.setPreferredAiProvider({ preferredAiProvider }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.preferences.get.queryOptions().queryKey,
      });
    },
  });

  const preferred = prefs.data?.preferredAiProvider ?? null;
  const modelId = localModelId ?? preferred ?? "google";

  const { error, messages, sendMessage, setMessages, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: getApiUrl("/api/ai"),
      credentials: "include",
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";
  const errorMessage = resolveChatErrorMessage(error);
  const records = useMemo(() => toChatRecords(messages), [messages]);
  const showEmpty = records.length === 0 && !isBusy;

  const transcript: TranscriptRecord = useMemo(() => {
    if (errorMessage) {
      return {
        messages: [
          ...records,
          {
            at: "Agora",
            id: "error",
            parts: [{ kind: "error", text: errorMessage }],
            role: "assistant" as const,
          },
        ],
      };
    }
    return { messages: records };
  }, [errorMessage, records]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) {
      return;
    }
    sendMessage({ text: trimmed }).catch(() => undefined);
  };

  const handleToggleDraft = (draft: DraftPayload) => {
    if (
      operatorDraft &&
      operatorDraft.heading === draft.heading &&
      operatorDraft.paragraphs.join("\n") === draft.paragraphs.join("\n")
    ) {
      setOperatorDraft(null);
      return;
    }
    setOperatorDraft(draft);
  };

  const handleModelChange = (id: string) => {
    setLocalModelId(id);
    if (id === "anthropic" || id === "openai") {
      setPreferred.mutate(id);
      return;
    }
    if (id === "google") {
      setPreferred.mutate(null);
    }
  };

  const handleRetry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const prompt = lastUser ? messageText(lastUser) : "";
    if (!prompt || isBusy) {
      return;
    }
    const withoutTrailingAssistant = [...messages];
    while (
      withoutTrailingAssistant.length > 0 &&
      withoutTrailingAssistant.at(-1)?.role === "assistant"
    ) {
      withoutTrailingAssistant.pop();
    }
    setMessages(withoutTrailingAssistant);
    sendMessage({ text: prompt }).catch(() => undefined);
  };

  const handleNewChat = () => {
    setMessages([]);
    stop();
  };

  const handleOpenThread = () => {
    setMessages([]);
  };

  const handleStop = () => {
    stop();
  };

  const handleArrived = () => undefined;

  return (
    <AssistantPanel
      arrivingId={null}
      drafted={operatorDraft !== null}
      modelId={modelId}
      onArrived={handleArrived}
      onClose={onClose ?? closeOperator}
      onModelChange={handleModelChange}
      onNewChat={handleNewChat}
      onOpenThread={handleOpenThread}
      onRetry={handleRetry}
      onSend={handleSend}
      onStop={handleStop}
      onToggleDraft={handleToggleDraft}
      overlay={overlay}
      showEmpty={showEmpty}
      stopped={false}
      stoppedIds={[]}
      streaming={isBusy}
      threadTitle={ASSISTANT_NAME}
      transcript={transcript}
    />
  );
}
