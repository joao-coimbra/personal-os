// @ts-nocheck
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@personal-os/ui/components/avatar";
import { Button } from "@personal-os/ui/components/button";
import { Field, FieldLabel } from "@personal-os/ui/components/field";
import { Input } from "@personal-os/ui/components/input";
import { Item, ItemGroup } from "@personal-os/ui/components/item";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@personal-os/ui/components/reui/alert";
import { Badge } from "@personal-os/ui/components/reui/badge";
import { ScrollArea } from "@personal-os/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@personal-os/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@personal-os/ui/components/sheet";
import { Textarea } from "@personal-os/ui/components/textarea";
import {
  AlertCircleIcon,
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  LockIcon,
  RefreshCwIcon,
  RouteIcon,
  ShieldCheckIcon,
  Trash2Icon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import {
  APPROVERS,
  KIND_LABEL,
  STAGE_BY_ID,
  type StageData,
  type StageMeta,
} from "./data";
import { DotSeparator, KIND_GLYPH, StatusCell } from "./run-board-cells";
import {
  formatClock,
  formatCost,
  formatDuration,
  formatTokens,
  type StageSlack,
} from "./schedule";

const STAGE_FORM_ID = "run-board-stage-form";

/** 15 minute steps across the whole day: the board's snap, and its full range. */
const TIME_STEPS: number[] = Array.from({ length: 96 }, (_, i) => i * 15);

type StageSheetMode = "view" | "edit" | "create";

interface StageDraft {
  endMin: number;
  /** Bar id, or null while scheduling a new one. */
  id: string | null;
  note: string;
  stageId: string;
  /** Minutes from midnight, always a multiple of 15. */
  startMin: number;
  title: string;
}

interface StageSheetState {
  /** The executed bar behind the draft; null while creating. */
  data: StageData | null;
  draft: StageDraft;
  mode: StageSheetMode;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button
      className="-me-1 shrink-0"
      onClick={onClose}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <XIcon aria-hidden="true" className="size-4" />
      <span className="sr-only">Close</span>
    </Button>
  );
}

function DetailRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

/** Section heading inside the sheet body. Quiet, because the data is the point. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      {children}
    </p>
  );
}

/**
 * The calls the stage actually made. Names stay monospaced because an operator
 * copies them into a log query, and a wrapped tool id is unusable.
 */
function ToolTrace({ data }: { data: StageData }) {
  if (data.toolCalls.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Tool Calls</SectionLabel>
      <ItemGroup className="gap-1.5">
        {data.toolCalls.map((call) => (
          <Item
            className="gap-2"
            key={`${call.name}-${call.latency}`}
            size="xs"
            variant="outline"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-xs">
              {call.name}
            </span>
            <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
              {call.latency}
            </span>
            <Badge
              className="shrink-0"
              radius="full"
              variant={call.ok ? "success-light" : "destructive-light"}
            >
              {call.ok ? "Concluído" : "Failed"}
            </Badge>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}

function ApproverRow({ stageId }: { stageId: string }) {
  const approver = APPROVERS[stageId];
  if (!approver) {
    return null;
  }
  return (
    <DetailRow icon={<ShieldCheckIcon />}>
      <div className="flex items-center gap-2">
        <Avatar className="size-5">
          <AvatarImage alt="" loading="lazy" src={approver.image} />
          <AvatarFallback className="text-[9px]">
            {approver.name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-foreground">{approver.name}</span>
        <DotSeparator />
        <span className="shrink-0 text-muted-foreground text-xs">
          {approver.role}
        </span>
      </div>
    </DetailRow>
  );
}

function StageView({
  draft,
  data,
  stage,
  slack,
  waitsFor,
  cutoffLabel,
  onEdit,
  onRerun,
  onClose,
}: {
  draft: StageDraft;
  data: StageData;
  stage: StageMeta;
  slack: StageSlack | null;
  waitsFor: string | null;
  cutoffLabel: string;
  onEdit: () => void;
  onRerun: () => void;
  onClose: () => void;
}) {
  const counter = data.attempt
    ? `Attempt ${data.attempt} of ${data.attempts}`
    : data.shard
      ? `Shard ${data.shard} of ${data.shards}`
      : null;
  const slackLabel = slack?.blocked
    ? "Blocked behind a failure"
    : slack?.fixed
      ? "Fixed window"
      : slack
        ? `${formatDuration(slack.minutes)} of slack`
        : null;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2.5 border-b px-5 py-3">
        <SheetTitle className="min-w-0 shrink truncate font-semibold text-lg leading-tight">
          {draft.title}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {stage.description}
        </SheetDescription>
        <StatusCell status={data.status} />
        <div aria-hidden="true" className="flex-1" />
        <CloseButton onClose={onClose} />
      </div>

      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-6 px-5 py-5">
            {/* What the stage is for, before what it did: an operator opening a
              failed stage may never have seen this playbook before. */}
            <p className="text-muted-foreground text-sm">{stage.description}</p>

            <div className="flex flex-col gap-4">
              <DetailRow icon={<ClockIcon />}>
                <div className="flex items-center gap-2">
                  <span className="text-foreground tabular-nums">
                    {formatClock(draft.startMin)} to {formatClock(draft.endMin)}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatDuration(draft.endMin - draft.startMin)}
                  </span>
                </div>
              </DetailRow>

              <DetailRow icon={KIND_GLYPH[data.kind]}>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      data.kind === "tool"
                        ? "truncate font-mono text-foreground text-xs"
                        : "truncate text-foreground"
                    }
                  >
                    {data.runner}
                  </span>
                  <DotSeparator />
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {KIND_LABEL[data.kind]}
                  </span>
                </div>
              </DetailRow>

              <DetailRow icon={<RouteIcon />}>
                <div className="flex items-center gap-2">
                  <span className="truncate text-foreground">
                    {waitsFor ? `Waits for ${waitsFor}` : "Trigger stage"}
                  </span>
                  {slackLabel ? (
                    <>
                      <DotSeparator />
                      <span
                        className={
                          slack?.blocked || (slack && slack.minutes <= 0)
                            ? "shrink-0 font-medium text-destructive text-xs"
                            : "shrink-0 text-muted-foreground text-xs"
                        }
                      >
                        {slackLabel}
                      </span>
                    </>
                  ) : null}
                </div>
              </DetailRow>

              <ApproverRow stageId={stage.id} />

              {counter ? (
                <DetailRow icon={<LayersIcon />}>
                  <p className="text-foreground">{counter}</p>
                </DetailRow>
              ) : null}

              <DetailRow icon={<ZapIcon />}>
                <div className="flex items-center gap-2">
                  <span className="text-foreground tabular-nums">
                    {formatTokens(data.tokens)} tokens
                  </span>
                  <DotSeparator />
                  <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    {formatCost(data.costUsd)}
                  </span>
                </div>
              </DetailRow>

              {draft.note ? (
                <DetailRow icon={<FileTextIcon />}>
                  <p className="text-foreground">{draft.note}</p>
                </DetailRow>
              ) : null}
            </div>

            {data.error ? (
              <Alert variant="destructive">
                <AlertCircleIcon aria-hidden="true" />
                <AlertTitle>{data.error.title}</AlertTitle>
                <AlertDescription>{data.error.detail}</AlertDescription>
              </Alert>
            ) : null}

            {data.frozen ? (
              <Alert variant="info">
                <LockIcon aria-hidden="true" />
                <AlertTitle>Audited Window</AlertTitle>
                <AlertDescription>
                  Fixed slot. The playbook still lands by {cutoffLabel}.
                </AlertDescription>
              </Alert>
            ) : null}

            <ToolTrace data={data} />
          </div>
        </ScrollArea>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t bg-muted px-5 py-3">
        <Button onClick={onRerun} type="button" variant="outline">
          <RefreshCwIcon aria-hidden="true" className="size-4" />
          Re-run
        </Button>
        <div aria-hidden="true" className="flex-1" />
        <Button disabled={data.frozen === true} onClick={onEdit} type="button">
          Edit
        </Button>
      </div>
    </>
  );
}

function StageForm({
  draft,
  isEdit,
  stages,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  draft: StageDraft;
  isEdit: boolean;
  stages: StageMeta[];
  onChange: (draft: StageDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const patch = (partial: Partial<StageDraft>) =>
    onChange({ ...draft, ...partial });
  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b px-5 py-3">
        <SheetTitle className="flex-1 font-semibold text-base">
          {isEdit ? "Edit Stage" : "New Stage"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {isEdit
            ? "Update this stage window."
            : "Schedule a stage into a playbook."}
        </SheetDescription>
        <CloseButton onClose={onClose} />
      </div>

      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <form
            className="flex flex-col gap-5 px-5 py-5"
            id={STAGE_FORM_ID}
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <Field className="gap-1.5">
              <FieldLabel htmlFor="stage-title">Title</FieldLabel>
              <Input
                autoComplete="off"
                id="stage-title"
                onChange={(event) => patch({ title: event.target.value })}
                placeholder="Capture Refund"
                value={draft.title}
              />
            </Field>

            {/* An execution belongs to its stage, and the gantt never moves a
              bar across rows, so the row is only chosen when one is created. */}
            {isEdit ? (
              <Field className="gap-1.5">
                <FieldLabel htmlFor="stage-row">Stage</FieldLabel>
                <div
                  className="flex items-center gap-2 text-muted-foreground text-sm"
                  id="stage-row"
                >
                  {KIND_GLYPH[STAGE_BY_ID.get(draft.stageId)?.kind ?? "tool"]}
                  <span className="truncate">
                    {STAGE_BY_ID.get(draft.stageId)?.title ?? draft.stageId}
                  </span>
                </div>
              </Field>
            ) : (
              <Field className="gap-1.5">
                <FieldLabel htmlFor="stage-row">Stage</FieldLabel>
                <Select
                  onValueChange={(value: string | null) => {
                    if (value) {
                      patch({ stageId: value });
                    }
                  }}
                  value={draft.stageId}
                >
                  <SelectTrigger className="w-full" id="stage-row">
                    <SelectValue>
                      {STAGE_BY_ID.get(draft.stageId)?.title ?? "Select stage"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <span className="flex items-center gap-2">
                          {KIND_GLYPH[stage.kind]}
                          {stage.title}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="stage-start">Start</FieldLabel>
                <Select
                  onValueChange={(value: string | null) => {
                    if (!value) {
                      return;
                    }
                    const startMin = Number(value);
                    // never let a window collapse below one snap step
                    const endMin =
                      draft.endMin > startMin ? draft.endMin : startMin + 15;
                    patch({ endMin, startMin });
                  }}
                  value={String(draft.startMin)}
                >
                  <SelectTrigger className="w-full" id="stage-start">
                    <SelectValue>{formatClock(draft.startMin)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {TIME_STEPS.map((step) => (
                      <SelectItem key={step} value={String(step)}>
                        {formatClock(step)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="stage-end">End</FieldLabel>
                <Select
                  onValueChange={(value: string | null) => {
                    if (!value) {
                      return;
                    }
                    const endMin = Number(value);
                    patch({
                      endMin:
                        endMin > draft.startMin ? endMin : draft.startMin + 15,
                    });
                  }}
                  value={String(draft.endMin)}
                >
                  <SelectTrigger className="w-full" id="stage-end">
                    <SelectValue>{formatClock(draft.endMin)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {TIME_STEPS.filter((step) => step > draft.startMin).map(
                      (step) => (
                        <SelectItem key={step} value={String(step)}>
                          {formatClock(step)}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field className="gap-1.5">
              <FieldLabel htmlFor="stage-note">Note</FieldLabel>
              <Textarea
                id="stage-note"
                onChange={(event) => patch({ note: event.target.value })}
                placeholder="Why this window, or what to watch for"
                rows={4}
                value={draft.note}
              />
            </Field>
          </form>
        </ScrollArea>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t bg-muted px-5 py-3">
        {isEdit ? (
          <Button
            className="me-auto"
            onClick={onDelete}
            type="button"
            variant="outline"
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
            Clear
          </Button>
        ) : null}
        <div aria-hidden="true" className="flex-1" />
        <Button onClick={onClose} type="button" variant="outline">
          Close
        </Button>
        <Button
          disabled={!draft.title.trim()}
          form={STAGE_FORM_ID}
          type="submit"
        >
          {isEdit ? "Save" : "Schedule"}
        </Button>
      </div>
    </>
  );
}

function StageSheet({
  state,
  stages,
  slack,
  waitsFor,
  cutoffLabel,
  onOpenChange,
  onDraftChange,
  onEdit,
  onRerun,
  onSave,
  onDelete,
}: {
  state: StageSheetState | null;
  stages: StageMeta[];
  slack: StageSlack | null;
  waitsFor: string | null;
  cutoffLabel: string;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: StageDraft) => void;
  onEdit: () => void;
  onRerun: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const stage = state ? STAGE_BY_ID.get(state.draft.stageId) : undefined;
  const showView = state?.mode === "view" && state.data !== null && stage;
  return (
    <Sheet onOpenChange={onOpenChange} open={state !== null}>
      {/* initialFocus off: autofocusing the first control pops its tooltip */}
      <SheetContent
        className="inset-y-4 right-4 left-auto flex h-[calc(100svh-2rem)] w-[min(30rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-xl p-0 outline-none"
        initialFocus={false}
        showCloseButton={false}
        side="right"
      >
        {state && showView && state.data ? (
          <StageView
            cutoffLabel={cutoffLabel}
            data={state.data}
            draft={state.draft}
            onClose={() => onOpenChange(false)}
            onEdit={onEdit}
            onRerun={onRerun}
            slack={slack}
            stage={stage}
            waitsFor={waitsFor}
          />
        ) : null}
        {state && !showView ? (
          <StageForm
            draft={state.draft}
            isEdit={state.mode === "edit"}
            onChange={onDraftChange}
            onClose={() => onOpenChange(false)}
            onDelete={onDelete}
            onSave={onSave}
            stages={stages}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export type { StageDraft, StageSheetMode, StageSheetState };
export { StageSheet, TIME_STEPS };
