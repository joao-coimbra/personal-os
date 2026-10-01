// @ts-nocheck
import { Button } from "@personal-os/ui/components/button";
import { Badge } from "@personal-os/ui/components/reui/badge";
import { IconTile } from "@personal-os/ui/components/reui/icon-tile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@personal-os/ui/components/tooltip";
import { PanelRightIcon, PlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { ChatEmpty, ChatThread } from "./chat-thread";
import { Composer } from "./composer";
import {
  ASSISTANT_NAME,
  type DraftPayload,
  THREADS,
  type TranscriptRecord,
} from "./data";

/** Static icon nodes: the shadcn CLI cannot resolve icon names from props. */
const ICON_UNDOCK = <PanelRightIcon aria-hidden="true" />;

const ICON_CLOSE = <XIcon aria-hidden="true" />;

export function AssistantPanel({
  showEmpty,
  transcript,
  streaming,
  stopped,
  stoppedIds,
  arrivingId,
  drafted,
  modelId,
  onModelChange,
  onToggleDraft,
  onSend,
  onStop,
  onNewChat,
  onOpenThread,
  onRetry,
  onArrived,
  threadTitle,
  overlay,
  onClose,
}: {
  /** True right after New chat, when the panel is showing its zero state. */
  showEmpty: boolean;
  transcript: TranscriptRecord;
  streaming: boolean;
  stopped: boolean;
  /** Settled replies that were stopped, so their note is not lost. */
  stoppedIds: string[];
  arrivingId: string | null;
  drafted: boolean;
  modelId: string;
  onModelChange: (id: string) => void;
  onToggleDraft: (draft: DraftPayload) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onNewChat: () => void;
  onOpenThread: (id: string) => void;
  onRetry: () => void;
  /** Fired once by the reveal when the arriving reply finishes typing. */
  onArrived: () => void;
  /** Names the open conversation in the header. */
  threadTitle: string;
  /** True in the sheet, where dismissing reads as close, not as undock. */
  overlay: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <IconTile aria-hidden="true" size="sm" variant="elevated">
          <SparklesIcon aria-hidden="true" />
        </IconTile>
        <h2 className="min-w-0 truncate font-medium text-sm">
          {showEmpty ? ASSISTANT_NAME : threadTitle}
        </h2>
        {streaming ? (
          <Badge className="shrink-0" variant="primary-light">
            Working
          </Badge>
        ) : null}

        <div className="ms-auto flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="New chat"
                  onClick={onNewChat}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <PlusIcon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>New chat</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={overlay ? "Close assistant" : "Collapse panel"}
                  onClick={onClose}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              {overlay ? ICON_CLOSE : ICON_UNDOCK}
            </TooltipTrigger>
            <TooltipContent>
              {overlay ? "Close assistant" : "Collapse panel"}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {showEmpty ? (
        <ChatEmpty
          onOpenThread={onOpenThread}
          onStart={onSend}
          threads={THREADS}
        />
      ) : (
        <ChatThread
          arrivingId={arrivingId}
          drafted={drafted}
          onArrived={onArrived}
          onRetry={onRetry}
          onSend={onSend}
          onToggleDraft={onToggleDraft}
          stopped={stopped}
          stoppedIds={stoppedIds}
          streaming={streaming}
          transcript={transcript}
        />
      )}

      <Composer
        modelId={modelId}
        onModelChange={onModelChange}
        onSend={onSend}
        onStop={onStop}
        streaming={streaming}
      />
    </div>
  );
}
