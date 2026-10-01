// @ts-nocheck
import { Button } from "@personal-os/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@personal-os/ui/components/dropdown-menu";
import { Badge } from "@personal-os/ui/components/reui/badge";
import type { GanttOccurrence } from "@personal-os/ui/components/reui/gantt/gantt-types";
import { cn } from "cn";
import {
  ActivityIcon,
  BotIcon,
  CheckIcon,
  CircleIcon,
  CircleXIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  FlaskConicalIcon,
  LockIcon,
  RefreshCwIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  STATUS_DOT,
  STATUS_LABEL,
  STATUS_TEXT,
  type StageData,
  type StageKind,
  type StageMeta,
  type StageStatus,
  type WorkflowMeta,
} from "./data";
import { formatSlack, formatTokens, type StageSlack } from "./schedule";

/**
 * Kind glyphs, whole and static. Every name is a literal so the shadcn CLI can
 * resolve the block down to a single icon library at install time; a variable
 * or a spread here would make the block uninstallable.
 */
const KIND_GLYPH: Record<StageKind, ReactNode> = {
  agent: <BotIcon aria-hidden="true" className="size-3.5 shrink-0" />,
  approval: (
    <ShieldCheckIcon aria-hidden="true" className="size-3.5 shrink-0" />
  ),
  eval: <FlaskConicalIcon aria-hidden="true" className="size-3.5 shrink-0" />,
  tool: <WrenchIcon aria-hidden="true" className="size-3.5 shrink-0" />,
};

/**
 * Status glyphs for the timeline. A bar's fill hue is the only other status
 * signal it carries, and hue alone fails in grayscale and for colour blindness,
 * so every bar pairs the hue with one of these shapes. Kind is deliberately NOT
 * on the bar: kind belongs to the stage, the stage is the row, and the row label
 * already shows it, whereas status varies bar to bar inside a single row.
 */
const STATUS_GLYPH: Record<StageStatus, ReactNode> = {
  failed: <CircleXIcon aria-hidden="true" className="size-3 shrink-0" />,
  queued: <CircleIcon aria-hidden="true" className="size-3 shrink-0" />,
  running: <ActivityIcon aria-hidden="true" className="size-3 shrink-0" />,
  succeeded: <CheckIcon aria-hidden="true" className="size-3 shrink-0" />,
  waiting: <ClockIcon aria-hidden="true" className="size-3 shrink-0" />,
};

/** The one inline separator the design system allows between rendered segments. */
function DotSeparator() {
  return (
    <span
      aria-hidden="true"
      className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
    />
  );
}

/**
 * The same status as a coloured SHAPE. Used where dots would repeat until they
 * stop being scannable: a list of playbooks reads as five identical circles,
 * whereas a tick, a pulse and a cross are told apart at a glance.
 */
function StatusGlyph({ status }: { status: StageStatus }) {
  return (
    <span className={cn("flex shrink-0 items-center", STATUS_TEXT[status])}>
      {STATUS_GLYPH[status]}
    </span>
  );
}

/** One status dot, so the tree badge and the filter menu can never drift apart. */
function StatusDot({ status }: { status: StageStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])}
    />
  );
}

// ------------------------------------------------------------------ tree labels

/**
 * A stage row. The glyph says who runs it, the badges say why it cannot move
 * freely, and both sit after the name so a long stage title is never the thing
 * that gets squeezed out.
 */
function StageLabel({
  stage,
  gate,
  frozen,
  highlight,
}: {
  stage: StageMeta;
  gate: boolean;
  frozen: boolean;
  /** On the critical path AND the toggle is on: the label leads the emphasis. */
  highlight: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "flex shrink-0 items-center text-muted-foreground",
          highlight && "text-foreground"
        )}
      >
        {KIND_GLYPH[stage.kind]}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          highlight && "font-medium"
        )}
      >
        {stage.title}
      </span>
      {gate ? (
        <Badge className="shrink-0" radius="full" variant="secondary">
          Gate
        </Badge>
      ) : null}
      {frozen ? (
        <LockIcon
          aria-label="Fixed compliance window"
          className="size-3.5 shrink-0 text-muted-foreground"
        />
      ) : null}
    </span>
  );
}

/**
 * A playbook row. The name gets the whole column: the run id is detail, and
 * truncating a playbook to "Data Steward Swe..." to fit "RUN-48..." beside it
 * loses the more useful half. The id stays one click away, in the stage sheet
 * and the bar's Copy Run ID action.
 */
function WorkflowLabel({ workflow }: { workflow: WorkflowMeta }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="min-w-0 truncate font-medium text-sm">
        {workflow.title}
      </span>
      <Badge className="shrink-0" radius="full" variant="secondary">
        {workflow.playbook}
      </Badge>
    </span>
  );
}

// ----------------------------------------------------------------- status cell

/** State is never color alone: the dot carries the hue, the word carries the fact. */
function StatusCell({ status }: { status: StageStatus }) {
  return (
    <Badge className="gap-1.5" radius="full" variant="outline">
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

// --------------------------------------------------------------- waits for cell

/** The one upstream stage that decides when this one may start. */
function WaitsForCell({ title }: { title: string | null }) {
  if (!title) {
    return <span className="text-muted-foreground/70 text-xs">Trigger</span>;
  }
  return (
    <span className="min-w-0 truncate text-muted-foreground text-xs">
      {title}
    </span>
  );
}

// -------------------------------------------------------------------- slack cell

/**
 * How much room a stage has before it starts pushing something. Zero is the
 * signal that matters, so it is the only value that takes the destructive tone.
 */
function SlackCell({ slack }: { slack: StageSlack | null }) {
  if (!slack) {
    return null;
  }
  if (slack.blocked) {
    return (
      <span className="font-medium text-destructive text-xs">Blocked</span>
    );
  }
  if (slack.fixed) {
    return <span className="text-muted-foreground text-xs">Fixed</span>;
  }
  if (slack.minutes <= 0) {
    return (
      <span className="font-medium text-destructive text-xs tabular-nums">
        {formatSlack(slack.minutes)}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {formatSlack(slack.minutes)}
    </span>
  );
}

// ------------------------------------------------------------------ tokens cell

/** What the row has spent. Groups roll their stages up so a collapse hides nothing. */
function TokensCell({ tokens }: { tokens: number }) {
  if (tokens === 0) {
    return <span className="text-muted-foreground/70 text-xs">None</span>;
  }
  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {formatTokens(tokens)}
    </span>
  );
}

// --------------------------------------------------------------------- bar body

/**
 * Stage bar: the glyph, the title, and the attempt or shard counter that turns a
 * stack of lanes from a mystery into a story. Container queries drop the counter
 * before it clips, so a 20 minute bar still reads.
 */
function StageBarBody({
  occurrence,
  muted,
}: {
  occurrence: GanttOccurrence<StageData>;
  muted: boolean;
}) {
  const data = occurrence.event.data;
  const counter = data?.attempt
    ? `Try ${data.attempt} of ${data.attempts}`
    : data?.shard
      ? `Shard ${data.shard} of ${data.shards}`
      : null;
  return (
    <span
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1.5",
        muted && "opacity-55"
      )}
    >
      {/* Every bar is labelled, however narrow: the title truncates rather than
        disappearing. The status glyph yields first, because below 4rem there is
        not enough room for both and the label is what identifies the bar. */}
      {data ? (
        <span className="@[4rem]:inline-flex hidden shrink-0 items-center">
          {STATUS_GLYPH[data.status]}
        </span>
      ) : null}
      {/* The lock belongs where the drag happens, not only in the tree row a
        thousand pixels away. */}
      {data?.frozen ? (
        <LockIcon
          aria-hidden="true"
          className="@[7rem]:inline hidden size-3 shrink-0 opacity-80"
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate font-medium">
        {occurrence.event.title}
      </span>
      {counter ? (
        <span className="@[11rem]:inline hidden shrink-0 text-foreground/70 tabular-nums">
          {counter}
        </span>
      ) : null}
    </span>
  );
}

// ------------------------------------------------------------------ row actions

function RowActionsMenu({
  stage,
  onOpen,
  onRerun,
  onClear,
}: {
  stage: StageMeta;
  onOpen: (stageId: string) => void;
  onRerun: (stageId: string) => void;
  onClear: (stageId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for ${stage.title}`}
            className="text-muted-foreground hover:text-foreground"
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <EllipsisVerticalIcon aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" side="bottom">
        <DropdownMenuItem onClick={() => onOpen(stage.id)}>
          <ActivityIcon aria-hidden="true" className="size-4" />
          Open Stage
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRerun(stage.id)}>
          <RefreshCwIcon aria-hidden="true" className="size-4" />
          Re-run Stage
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onClear(stage.id)}
          variant="destructive"
        >
          <Trash2Icon aria-hidden="true" className="size-4" />
          Clear Stage
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ----------------------------------------------------------------- columns menu

/** Pinned at the end of the tree header; the only home the primitive offers. */
function ColumnsMenu({
  options,
  visible,
  onToggle,
}: {
  /** Ids in header order, named by the column definitions themselves. */
  options: { id: string; label: string }[];
  visible: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Choose columns"
            className="text-muted-foreground hover:text-foreground"
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <Settings2Icon aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40" side="bottom">
        {/* Base UI requires a label to live inside its own group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              checked={visible.includes(option.id)}
              key={option.id}
              onCheckedChange={() => onToggle(option.id)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export {
  ColumnsMenu,
  DotSeparator,
  KIND_GLYPH,
  RowActionsMenu,
  SlackCell,
  StageBarBody,
  StageLabel,
  StatusCell,
  StatusDot,
  StatusGlyph,
  TokensCell,
  WaitsForCell,
  WorkflowLabel,
};
