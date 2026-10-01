// @ts-nocheck
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@personal-os/ui/components/alert-dialog";
import { Button } from "@personal-os/ui/components/button";
import { Card } from "@personal-os/ui/components/card";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@personal-os/ui/components/context-menu";
import {
  Gantt,
  type GanttColumn,
  type GanttRenderEventProps,
  type GanttTreePanelConfig,
} from "@personal-os/ui/components/reui/gantt/gantt";
import {
  GanttNav,
  GanttNavNext,
  GanttNavPrev,
  GanttNavToday,
  GanttTitle,
  GanttToolbar,
} from "@personal-os/ui/components/reui/gantt/gantt-nav";
import type {
  GanttOccurrence,
  GanttProposedUpdate,
  GanttResource,
  GanttSlotDraft,
  GanttSlotInfo,
  GanttUpdateResult,
} from "@personal-os/ui/components/reui/gantt/gantt-types";
import { GanttView } from "@personal-os/ui/components/reui/gantt/gantt-view";
import { cn } from "cn";
import { AlertCircleIcon, CircleCheckIcon, PlusIcon } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ALL_STAGES,
  buildStageBars,
  COLLAPSED_ON_OPEN,
  DEMO_NOW_MIN,
  STAGE_BY_ID,
  STAGE_EDGES,
  STATUS_COLOR,
  type StageBar,
  type StageData,
  type StageStatus,
  WORKFLOW_BY_ID,
  WORKFLOW_BY_STAGE,
  WORKFLOW_TREE,
  WORKFLOWS,
} from "./data";
import {
  ColumnsMenu,
  StageBarBody,
  StageLabel,
  WorkflowLabel,
} from "./run-board-cells";
import {
  buildStageColumns,
  COLUMN_IDS,
  COLUMN_LABELS,
  DEFAULT_COLUMNS,
  type RowFacts,
} from "./run-board-columns";
import {
  type BoardSettings,
  DEFAULT_SETTINGS,
  RunBoardSettings,
  type TreeMode,
} from "./run-board-settings";
import {
  criticalStages,
  cutoffInstantFor,
  cutoffLabelFor,
  earliestStart,
  formatClock,
  minutesOf,
  planRipple,
  type Refusal,
  type StageSlack,
  slackByStage,
  stageFinishDelta,
  windowsByStage,
} from "./schedule";
import {
  type StageDraft,
  StageSheet,
  type StageSheetState,
} from "./stage-sheet";

/** Deterministic anchor so screenshots and tests never drift. A Wednesday. */
const ANCHOR = new Date("2026-07-22T00:00:00");

/**
 * The board opens centred here rather than on the clock: a pinned demo date can
 * never contain the wall clock, and a report's opening composition must not
 * depend on the hour it is read at.
 */
const VIEW_DATE = new Date("2026-07-22T11:00:00");

/** Stable identity: a fresh i18n object per render would churn settings. */
const DEMO_I18N = { labels: { resources: "Stage" } };

const DEMO_RANGE_BOUNDS = {
  max: new Date("2027-12-31T23:59:59"),
  min: new Date("2026-01-01T00:00:00"),
};

/** An hour is 6rem wide: a 30 minute stage still reads without zooming. */
const DEMO_METRICS = { unitWidths: { day: 6 } };

/**
 * Tree panel geometry per mode. The primitive seeds its own width state from
 * `treePanel.width` on mount only, so switching modes remounts the gantt through
 * a key rather than trying to push a new width into settled state.
 */
const TREE_PANELS: Record<TreeMode, GanttTreePanelConfig> = {
  compact: { maxWidth: 720, minWidth: 180, nameColumnWidth: 212, width: 244 },
  full: { maxWidth: 720, minWidth: 280, nameColumnWidth: 264, width: 480 },
  hidden: { maxWidth: 0, minWidth: 0, resizable: false, width: 0 },
};

/** The tree pane and its splitter are the two things "hidden" has to remove. */
const HIDDEN_TREE_CLASS =
  "[&_[data-slot=gantt-tree-pane]]:hidden [&_[data-slot=gantt-splitter]]:hidden";

/** So the critical path toggle fades the board rather than snapping it. */
const BAR_CLASS_NAMES = { event: "transition-colors duration-200" };

/** A dimmed bar keeps its shape and loses its voice; the hue is the signal. */
const DIM_COLOR = "var(--color-muted-foreground)";

/** Worst state wins when a playbook row summarises its stages. */
const STATUS_RANK: Record<StageStatus, number> = {
  failed: 5,
  queued: 2,
  running: 3,
  succeeded: 1,
  waiting: 4,
};

const TOAST_SUCCESS_ICON = (
  <CircleCheckIcon aria-hidden="true" className="size-[18px] text-green-600" />
);
const TOAST_ERROR_ICON = (
  <AlertCircleIcon
    aria-hidden="true"
    className="size-[18px] text-destructive"
  />
);

/**
 * Sonner centers the icon against title AND description together, which
 * parks it between the two lines. Pinning the toast row to the top (the `!`
 * outranks sonner's own attribute selector) aligns the icon with the TITLE;
 * the nudge re-centers it optically on the title's line box.
 */
const TOAST_ALIGN = { icon: "mt-0.5", toast: "items-start!" };

const notifySuccess = (title: string, description: string) =>
  toast.success(title, {
    classNames: TOAST_ALIGN,
    description,
    icon: TOAST_SUCCESS_ICON,
  });
const notifyInfo = (title: string, description: string) =>
  toast.info(title, { classNames: TOAST_ALIGN, description });
const notifyError = (title: string, description: string) =>
  toast.error(title, {
    classNames: { icon: "mt-0.5 text-destructive", toast: TOAST_ALIGN.toast },
    description,
    icon: TOAST_ERROR_ICON,
  });

/** Build a Date on the anchor day at `minutes` past midnight. */
const atMinutes = (minutes: number) => {
  const date = new Date(ANCHOR);
  date.setHours(0, minutes, 0, 0);
  return date;
};

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();

interface ConfirmState {
  actionLabel: string;
  description: string;
  run: () => void;
  title: string;
}

function RunBoard() {
  const [bars, setBars] = useState<StageBar[]>(() => buildStageBars(ANCHOR));
  const [hiddenWorkflows, setHiddenWorkflows] = useState<Set<string>>(
    () => new Set()
  );
  const [dimmedStatuses, setDimmedStatuses] = useState<Set<StageStatus>>(
    () => new Set()
  );
  const [settings, setSettings] = useState<BoardSettings>(DEFAULT_SETTINGS);
  const [visibleColumns, setVisibleColumns] =
    useState<string[]>(DEFAULT_COLUMNS);
  const [sheet, setSheet] = useState<StageSheetState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const seqRef = useRef(0);

  // The validators run inside gesture callbacks that must never be re-created,
  // so they read the live bars through a ref rather than a closure.
  const barsRef = useRef(bars);
  barsRef.current = bars;

  /**
   * The ripple onEventUpdate approved, handed to onEventsChange. The primitive
   * calls the two back to back and synchronously, so a ref is a safe handoff,
   * and clearing it on read means an events change from any other path can
   * never replay a stale plan.
   */
  const pendingRipple = useRef<Map<string, number> | null>(null);

  // ---------------------------------------------------------------- derived

  const slack = useMemo(() => slackByStage(bars), [bars]);
  const criticalIds = useMemo(() => criticalStages(slack), [slack]);

  /**
   * Hiding a playbook filters the TREE, never the events. A bar whose row is
   * gone is simply not rendered, so the rollup denominator, the slack graph and
   * the ripple all keep working on the whole board. Dependency edges never
   * cross a playbook, so a hidden playbook can never hide a ripple target.
   */
  const visibleWorkflows = useMemo<GanttResource[]>(
    () => WORKFLOW_TREE.filter((node) => !hiddenWorkflows.has(node.id)),
    [hiddenWorkflows]
  );

  const rowFacts = useMemo(() => {
    const facts = new Map<string, RowFacts>();
    const byStage = windowsByStage(bars);
    for (const workflow of WORKFLOWS) {
      let groupStatus: StageStatus = "succeeded";
      let groupTokens = 0;
      let groupSlack: StageSlack | null = null;
      for (const stage of workflow.stages) {
        const window = byStage.get(stage.id);
        if (!window) {
          continue;
        }
        // the bar that finishes last is the one that says where the stage got to
        const latest = window.bars.reduce((held, bar) =>
          bar.end.getTime() > held.end.getTime() ? bar : held
        );
        const status = latest.data?.status ?? "queued";
        const tokens = window.bars.reduce(
          (total, bar) => total + (bar.data?.tokens ?? 0),
          0
        );
        const stageSlack = slack.get(stage.id) ?? null;
        const upstream = stage.dependsOn[0];
        facts.set(stage.id, {
          slack: stageSlack,
          status,
          tokens,
          waitsFor: upstream
            ? (STAGE_BY_ID.get(upstream)?.title ?? null)
            : null,
        });
        if (STATUS_RANK[status] > STATUS_RANK[groupStatus]) {
          groupStatus = status;
        }
        groupTokens += tokens;
        if (
          stageSlack &&
          !stageSlack.fixed &&
          (!groupSlack || stageSlack.minutes < groupSlack.minutes)
        ) {
          groupSlack = stageSlack;
        }
      }
      facts.set(workflow.id, {
        slack: groupSlack,
        status: groupStatus,
        tokens: groupTokens,
        waitsFor: null,
      });
    }
    return facts;
  }, [bars, slack]);

  /** The filter menu shows each playbook's live state before you filter on it. */
  const workflowStatus = useMemo(() => {
    const map = new Map<string, StageStatus>();
    for (const workflow of WORKFLOWS) {
      const facts = rowFacts.get(workflow.id);
      if (facts) {
        map.set(workflow.id, facts.status);
      }
    }
    return map;
  }, [rowFacts]);

  /** Which rows carry an audited window, so the tree lock never reads stale. */
  const frozenStages = useMemo(() => {
    const frozen = new Set<string>();
    for (const bar of bars) {
      if (bar.readOnly === true && bar.resourceId) {
        frozen.add(bar.resourceId);
      }
    }
    return frozen;
  }, [bars]);

  /**
   * Display colour lives here and nowhere else. The state stays colourless,
   * because applyProposedUpdate spreads the array it was handed back over our
   * own objects - adopting it wholesale would bake a dimmed bar in permanently.
   */
  const timelineBars = useMemo<StageBar[]>(() => {
    // The dependency graph the board ENFORCES (schedule.ts) finally drawn:
    // STAGE_EDGES is stage-level while the gantt's arrows are bar-level, so
    // each edge runs from the upstream stage's LAST bar into this stage's
    // FIRST bar - the same envelope instants stageFinishDelta reasons about.
    // Display-only, exactly like the dim color below: handleBarsChange
    // re-times the block's OWN bars, so nothing here ever reaches state.
    const firstOf = new Map<string, StageBar>();
    const lastOf = new Map<string, StageBar>();
    for (const bar of bars) {
      const stageId = bar.data?.stageId;
      if (!stageId) {
        continue;
      }
      const first = firstOf.get(stageId);
      if (!first || bar.start.getTime() < first.start.getTime()) {
        firstOf.set(stageId, bar);
      }
      const last = lastOf.get(stageId);
      if (!last || bar.end.getTime() > last.end.getTime()) {
        lastOf.set(stageId, bar);
      }
    }
    return bars.map((bar) => {
      const status = bar.data?.status ?? "queued";
      const dimmed =
        (settings.criticalOnly && !criticalIds.has(bar.resourceId ?? "")) ||
        dimmedStatuses.has(status);
      const stageId = bar.data?.stageId;
      const dependencies =
        stageId && firstOf.get(stageId)?.id === bar.id
          ? (STAGE_EDGES[stageId] ?? [])
              .map((upstream) => lastOf.get(upstream)?.id)
              .filter((id): id is string => id !== undefined)
          : undefined;
      return {
        ...bar,
        color: dimmed ? DIM_COLOR : STATUS_COLOR[status],
        ...(dependencies?.length ? { dependencies } : {}),
      };
    });
  }, [bars, settings.criticalOnly, criticalIds, dimmedStatuses]);

  // -------------------------------------------------------------- validation

  /**
   * The three rules the board holds, in one place so a refused drag, a red drag
   * ghost and a refused save can never disagree about what is legal.
   */
  const validateWindow = useCallback(
    (barId: string | null, stageId: string, start: Date, end: Date) => {
      const windows = windowsByStage(
        barsRef.current.filter((bar) => bar.id !== barId)
      );
      const earliest = earliestStart(stageId, windows);
      if (earliest && start.getTime() < earliest.at.getTime()) {
        return {
          detail: `This stage waits on ${earliest.blocker}, which finishes at ${formatClock(earliest.at)}.`,
          title: "Upstream still running",
        };
      }
      const cutoffAt = cutoffInstantFor(stageId, start);
      if (end.getTime() > cutoffAt.getTime()) {
        return {
          detail: `The playbook has to land by ${formatClock(cutoffAt)}.`,
          title: "Past the run cutoff",
        };
      }
      const frozen = barsRef.current.find(
        (bar) =>
          bar.id !== barId &&
          bar.resourceId === stageId &&
          bar.readOnly === true &&
          overlaps(start, end, bar.start, bar.end)
      );
      if (frozen) {
        return {
          detail: `That would overlap "${frozen.title}", which is fixed in the calendar.`,
          title: "Audited window",
        };
      }
      return null;
    },
    []
  );

  /** Advisory only: this paints the drag ghost. onEventUpdate is the veto. */
  const canDropStage = useCallback(
    (update: GanttProposedUpdate<StageData>) => {
      const bar = barsRef.current.find((item) => item.id === update.event.id);
      const stageId = bar?.resourceId;
      if (!(bar && stageId)) {
        return false;
      }
      if (validateWindow(bar.id, stageId, update.start, update.end)) {
        return false;
      }
      const deltaMs = stageFinishDelta(
        barsRef.current,
        stageId,
        bar.id,
        update.end
      );
      return planRipple(barsRef.current, stageId, deltaMs).refusal === null;
    },
    [validateWindow]
  );

  /**
   * The veto that actually holds. canDropStage above is advisory: on its own a
   * stage dragged in front of its upstream turns the ghost red and then commits
   * anyway. This is the one hook applyProposedUpdate honours, so this is where
   * the graph is defended and where the ripple is planned.
   */
  const handleStageUpdate = useCallback(
    (update: GanttProposedUpdate<StageData>): GanttUpdateResult => {
      pendingRipple.current = null;
      const bar = barsRef.current.find((item) => item.id === update.event.id);
      const stageId = bar?.resourceId;
      if (!(bar && stageId)) {
        return false;
      }

      const refusal = validateWindow(bar.id, stageId, update.start, update.end);
      if (refusal) {
        notifyError(refusal.title, refusal.detail);
        return false;
      }

      // What the graph cares about is when the whole STAGE now finishes, not
      // when this one bar does: a row holding three attempts is only done when
      // its last one ends, so shuffling an earlier attempt inside that envelope
      // costs nothing downstream. Measuring the bar would both shove chains that
      // nothing pinned and refuse moves that were always legal.
      const deltaMs = stageFinishDelta(
        barsRef.current,
        stageId,
        bar.id,
        update.end
      );
      const plan = planRipple(barsRef.current, stageId, deltaMs);
      if (plan.refusal) {
        notifyError(plan.refusal.title, plan.refusal.detail);
        return false;
      }
      pendingRipple.current = plan.shifts.size > 0 ? plan.shifts : null;
      return true;
    },
    [validateWindow]
  );

  /**
   * Timing only. `next` is the DERIVED array the gantt was handed, so it carries
   * the display colour the memo above added; applyProposedUpdate spreads it
   * over our objects. Adopting `next` wholesale would write that colour into
   * state. Do not simplify this to setBars(next).
   */
  const handleBarsChange = useCallback((next: StageBar[]) => {
    const shifts = pendingRipple.current;
    pendingRipple.current = null;
    const timing = new Map(next.map((bar) => [bar.id, bar]));
    const merged = barsRef.current.map((bar) => {
      const patched = timing.get(bar.id);
      const shift = shifts?.get(bar.id) ?? 0;
      if (!patched && shift === 0) {
        return bar;
      }
      const start = new Date((patched?.start ?? bar.start).getTime() + shift);
      const end = new Date((patched?.end ?? bar.end).getTime() + shift);
      if (
        start.getTime() === bar.start.getTime() &&
        end.getTime() === bar.end.getTime()
      ) {
        return bar;
      }
      return { ...bar, end, start };
    });
    setBars(merged);

    if (shifts && shifts.size > 0) {
      const stages = new Set<string>();
      for (const bar of barsRef.current) {
        if (shifts.has(bar.id) && bar.resourceId) {
          stages.add(bar.resourceId);
        }
      }
      notifyInfo(
        "Downstream rescheduled",
        `${stages.size} ${stages.size === 1 ? "stage" : "stages"} moved to keep the order.`
      );
    }
  }, []);

  /** Gates the hover placement tile too, so an illegal slot never invites a click. */
  const canSelectSlot = useCallback((slot: GanttSlotDraft) => {
    const stageId = slot.resourceId;
    if (!stageId) {
      return false;
    }
    const earliest = earliestStart(stageId, windowsByStage(barsRef.current));
    return !earliest || slot.start.getTime() >= earliest.at.getTime();
  }, []);

  // ------------------------------------------------------------------- sheet

  const draftFromBar = useCallback(
    (bar: StageBar): StageDraft => ({
      endMin: minutesOf(bar.end),
      id: bar.id,
      note: bar.data?.note ?? "",
      stageId: bar.resourceId ?? "",
      startMin: minutesOf(bar.start),
      title: bar.title,
    }),
    []
  );

  const openBar = useCallback(
    (bar: StageBar) => {
      setSheet({
        data: bar.data ?? null,
        draft: draftFromBar(bar),
        mode: "view",
      });
    },
    [draftFromBar]
  );

  /** The bar that finished last is the one an operator means by "this stage". */
  const latestBarOf = useCallback((stageId: string) => {
    let latest: StageBar | null = null;
    for (const bar of barsRef.current) {
      if (bar.resourceId !== stageId) {
        continue;
      }
      if (!latest || bar.end.getTime() > latest.end.getTime()) {
        latest = bar;
      }
    }
    return latest;
  }, []);

  const handleEventClick = useCallback(
    (occurrence: GanttOccurrence<StageData>) => {
      const bar = barsRef.current.find(
        (item) => item.id === occurrence.event.id
      );
      if (bar) {
        openBar(bar);
      }
    },
    [openBar]
  );

  const openCreate = useCallback((stageId: string, startMin: number) => {
    const stage = STAGE_BY_ID.get(stageId);
    setSheet({
      data: null,
      draft: {
        endMin: startMin + 30,
        id: null,
        note: "",
        stageId,
        startMin,
        title: stage?.title ?? "",
      },
      mode: "create",
    });
  }, []);

  const handleSlotClick = useCallback(
    (slot: GanttSlotInfo) => {
      if (!slot.resourceId) {
        return;
      }
      openCreate(slot.resourceId, minutesOf(slot.date));
    },
    [openCreate]
  );

  /** The first stage still to run, so the primary button never opens on history. */
  const handleToolbarCreate = useCallback(() => {
    const pending = ALL_STAGES.find((stage) => {
      const bar = latestBarOf(stage.id);
      const status = bar?.data?.status;
      return status === "queued" || status === "waiting";
    });
    const stage = pending ?? ALL_STAGES[0];
    if (!stage) {
      return;
    }
    const existing = latestBarOf(stage.id);
    openCreate(stage.id, existing ? minutesOf(existing.end) : DEMO_NOW_MIN);
  }, [latestBarOf, openCreate]);

  /**
   * Adding a bar to a row can push the whole stage's finish out, so a re-run
   * goes through exactly the same ripple the drag path uses. Skipping it was how
   * the board could break its own invariant from its own menu.
   */
  const appendBar = useCallback(
    (
      stageId: string,
      start: Date,
      end: Date,
      build: (attempts: number) => StageBar,
      toast: { title: string; detail: string }
    ) => {
      const refusal = validateWindow(null, stageId, start, end);
      if (refusal) {
        notifyError(refusal.title, refusal.detail);
        return;
      }
      const deltaMs = stageFinishDelta(barsRef.current, stageId, null, end);
      const plan = planRipple(barsRef.current, stageId, deltaMs);
      if (plan.refusal) {
        notifyError(plan.refusal.title, plan.refusal.detail);
        return;
      }
      // only bars that already record an attempt get renumbered; a fan out row
      // holds shards, and calling a new shard "Try 4 of 4" would be a lie
      const attempts =
        barsRef.current.filter(
          (bar) => bar.resourceId === stageId && bar.data?.attempt
        ).length + 1;
      const next: StageBar[] = barsRef.current.map((bar) => {
        const patched =
          bar.resourceId === stageId && bar.data?.attempt
            ? { ...bar, data: { ...bar.data, attempts } }
            : bar;
        const shift = plan.shifts.get(bar.id) ?? 0;
        if (shift === 0) {
          return patched;
        }
        return {
          ...patched,
          end: new Date(patched.end.getTime() + shift),
          start: new Date(patched.start.getTime() + shift),
        };
      });
      next.push(build(attempts));
      setBars(next);
      notifySuccess(toast.title, toast.detail);
      if (plan.shifts.size > 0) {
        notifyInfo(
          "Downstream rescheduled",
          "The chain behind it moved to keep the order."
        );
      }
    },
    [validateWindow]
  );

  /** A re-run appends the next attempt straight after the last one on that row. */
  const rerunStage = useCallback(
    (stageId: string) => {
      const previous = latestBarOf(stageId);
      const stage = STAGE_BY_ID.get(stageId);
      if (!(previous && stage)) {
        return;
      }
      const spanMs = previous.end.getTime() - previous.start.getTime();
      const start = new Date(previous.end.getTime());
      const end = new Date(start.getTime() + spanMs);
      const workflow = WORKFLOW_BY_STAGE.get(stageId);
      appendBar(
        stageId,
        start,
        end,
        (attempts) => {
          seqRef.current += 1;
          return {
            allDay: false,
            data: {
              attempt: attempts,
              attempts,
              costUsd: 0,
              kind: stage.kind,
              note: "Queued by hand from the board.",
              runner: stage.runner,
              stageId,
              status: "queued",
              tokens: 0,
              toolCalls: [],
              workflowId: workflow?.id ?? "",
            },
            end,
            id: `stage-rerun-${seqRef.current}`,
            progress: 0,
            resourceId: stageId,
            start,
            title: stage.title,
          };
        },
        {
          detail: `${stage.title} runs again at ${formatClock(start)}.`,
          title: "Re-run queued",
        }
      );
    },
    [appendBar, latestBarOf]
  );

  const clearStage = useCallback((stageId: string) => {
    const stage = STAGE_BY_ID.get(stageId);
    if (!stage) {
      return;
    }
    setConfirm({
      actionLabel: "Clear Stage",
      description:
        "Every execution on this stage leaves the board. Anything waiting on it keeps its own window.",
      run: () => {
        setBars(barsRef.current.filter((bar) => bar.resourceId !== stageId));
        setSheet(null);
        notifySuccess("Stage cleared", `${stage.title} has no executions.`);
      },
      title: `Clear ${stage.title}?`,
    });
  }, []);

  const removeBar = useCallback((barId: string) => {
    const bar = barsRef.current.find((item) => item.id === barId);
    if (!bar) {
      return;
    }
    setConfirm({
      actionLabel: "Clear",
      description: "This execution leaves the board and cannot be restored.",
      run: () => {
        setBars(barsRef.current.filter((item) => item.id !== barId));
        setSheet(null);
        notifySuccess("Execution cleared", bar.title);
      },
      title: `Clear ${bar.title}?`,
    });
  }, []);

  const handleSheetSave = useCallback(() => {
    if (!sheet) {
      return;
    }
    const { draft } = sheet;
    const start = atMinutes(draft.startMin);
    const end = atMinutes(draft.endMin);
    const title = draft.title.trim();
    const note = draft.note.trim();

    if (draft.id === null) {
      const stage = STAGE_BY_ID.get(draft.stageId);
      if (!stage) {
        return;
      }
      const workflow = WORKFLOW_BY_STAGE.get(draft.stageId);
      appendBar(
        draft.stageId,
        start,
        end,
        () => {
          seqRef.current += 1;
          return {
            allDay: false,
            data: {
              costUsd: 0,
              kind: stage.kind,
              note: note || undefined,
              runner: stage.runner,
              stageId: draft.stageId,
              status: "queued",
              tokens: 0,
              toolCalls: [],
              workflowId: workflow?.id ?? "",
            },
            end,
            id: `stage-added-${seqRef.current}`,
            progress: 0,
            resourceId: draft.stageId,
            start,
            title,
          };
        },
        {
          detail: `${title} at ${formatClock(start)}.`,
          title: "Stage scheduled",
        }
      );
      setSheet(null);
      return;
    }

    const refusal: Refusal | null = validateWindow(
      draft.id,
      draft.stageId,
      start,
      end
    );
    if (refusal) {
      notifyError(refusal.title, refusal.detail);
      return;
    }

    const existing = barsRef.current.find((item) => item.id === draft.id);
    if (!existing) {
      setSheet(null);
      return;
    }
    const plan = planRipple(
      barsRef.current,
      draft.stageId,
      stageFinishDelta(barsRef.current, draft.stageId, existing.id, end)
    );
    if (plan.refusal) {
      notifyError(plan.refusal.title, plan.refusal.detail);
      return;
    }
    setBars(
      barsRef.current.map((bar) => {
        if (bar.id === existing.id) {
          return {
            ...bar,
            data: bar.data
              ? { ...bar.data, note: note || undefined }
              : bar.data,
            end,
            start,
            title,
          };
        }
        const shift = plan.shifts.get(bar.id) ?? 0;
        if (shift === 0) {
          return bar;
        }
        return {
          ...bar,
          end: new Date(bar.end.getTime() + shift),
          start: new Date(bar.start.getTime() + shift),
        };
      })
    );
    setSheet(null);
    notifySuccess(
      "Stage updated",
      plan.shifts.size > 0
        ? `${title} moved, and the chain behind it followed.`
        : `${title} now runs at ${formatClock(start)}.`
    );
  }, [sheet, appendBar, validateWindow]);

  // ----------------------------------------------------------------- filters

  const toggleWorkflow = useCallback((workflowId: string) => {
    setHiddenWorkflows((prev) => {
      const next = new Set(prev);
      if (next.has(workflowId)) {
        next.delete(workflowId);
      } else {
        next.add(workflowId);
      }
      return next;
    });
  }, []);

  const toggleStatus = useCallback((status: StageStatus) => {
    setDimmedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const patchSettings = useCallback((patch: Partial<BoardSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetView = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const resetFilters = useCallback(() => {
    setHiddenWorkflows(new Set());
    setDimmedStatuses(new Set());
  }, []);

  const toggleColumn = useCallback((id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : COLUMN_IDS.filter((item) => prev.includes(item) || item === id)
    );
  }, []);

  // ----------------------------------------------------------------- columns

  const openLatestBar = useCallback(
    (stageId: string) => {
      const bar = latestBarOf(stageId);
      if (bar) {
        openBar(bar);
      }
    },
    [latestBarOf, openBar]
  );

  const columns = useMemo<GanttColumn[]>(
    () =>
      buildStageColumns({
        facts: rowFacts,
        onClear: clearStage,
        onOpen: openLatestBar,
        onRerun: rerunStage,
        visible: visibleColumns,
      }),
    [visibleColumns, rowFacts, openLatestBar, rerunStage, clearStage]
  );

  const columnOptions = useMemo(
    () => COLUMN_IDS.map((id) => ({ id, label: COLUMN_LABELS[id] ?? id })),
    []
  );

  const columnsMenu = useMemo(
    () => (
      <ColumnsMenu
        onToggle={toggleColumn}
        options={columnOptions}
        visible={visibleColumns}
      />
    ),
    [columnOptions, visibleColumns, toggleColumn]
  );

  // ------------------------------------------------------------ render props

  const renderStageBar = useCallback(
    ({ occurrence }: GanttRenderEventProps<StageData>) => {
      const status = occurrence.event.data?.status ?? "queued";
      const muted =
        (settings.criticalOnly &&
          !criticalIds.has(occurrence.event.resourceId ?? "")) ||
        dimmedStatuses.has(status);
      return <StageBarBody muted={muted} occurrence={occurrence} />;
    },
    [settings.criticalOnly, criticalIds, dimmedStatuses]
  );

  const renderStageLabel = useCallback(
    ({ resource, isGroup }: { resource: GanttResource; isGroup: boolean }) => {
      if (isGroup) {
        const workflow = WORKFLOW_BY_ID.get(resource.id);
        return workflow ? (
          <WorkflowLabel workflow={workflow} />
        ) : (
          resource.title
        );
      }
      const stage = STAGE_BY_ID.get(resource.id);
      if (!stage) {
        return resource.title;
      }
      return (
        <StageLabel
          frozen={frozenStages.has(stage.id)}
          gate={stage.gate === true}
          highlight={settings.criticalOnly && criticalIds.has(stage.id)}
          stage={stage}
        />
      );
    },
    [settings.criticalOnly, criticalIds, frozenStages]
  );

  const renderStageMenu = useCallback(
    ({ occurrence }: GanttRenderEventProps<StageData>) => {
      const runId = WORKFLOW_BY_ID.get(
        occurrence.event.data?.workflowId ?? ""
      )?.run;
      return (
        <>
          <ContextMenuItem onClick={() => handleEventClick(occurrence)}>
            Open Stage
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              const stageId = occurrence.event.resourceId;
              if (stageId) {
                rerunStage(stageId);
              }
            }}
          >
            Re-run
          </ContextMenuItem>
          {runId ? (
            <ContextMenuItem
              onClick={() => {
                navigator.clipboard.writeText(runId).then(
                  () => notifySuccess("Run id copied", runId),
                  () =>
                    notifyError(
                      "Could not copy",
                      "The browser blocked clipboard access."
                    )
                );
              }}
            >
              Copy Run ID
            </ContextMenuItem>
          ) : null}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => removeBar(occurrence.event.id)}
            variant="destructive"
          >
            Clear Execution
          </ContextMenuItem>
        </>
      );
    },
    [handleEventClick, rerunStage, removeBar]
  );

  /**
   * The rollup an operations lead actually reads: stages finished over stages
   * total. The default is duration weighted, which triple counts a row holding
   * three retry attempts and makes a failing playbook look busy rather than stuck.
   */
  const getStageRollup = useCallback(
    ({ events }: { resource: GanttResource; events: StageBar[] }) => {
      const latest = new Map<string, StageBar>();
      for (const bar of events) {
        const rowId = bar.resourceId;
        if (!rowId) {
          continue;
        }
        const held = latest.get(rowId);
        if (!held || bar.end.getTime() > held.end.getTime()) {
          latest.set(rowId, bar);
        }
      }
      if (latest.size === 0) {
        return null;
      }
      let done = 0;
      for (const bar of latest.values()) {
        if (bar.data?.status === "succeeded") {
          done += 1;
        }
      }
      return Math.round((done / latest.size) * 100);
    },
    []
  );

  // ------------------------------------------------------------------ render

  const sheetStageId = sheet?.draft.stageId ?? "";
  const sheetSlack = slack.get(sheetStageId) ?? null;
  const sheetWaitsFor = rowFacts.get(sheetStageId)?.waitsFor ?? null;

  return (
    <div className="flex h-svh w-full flex-col bg-background p-4">
      <Card className="min-h-0 flex-1 gap-0! p-0!">
        <Gantt
          canDropEvent={canDropStage}
          canSelectSlot={canSelectSlot}
          className={cn(
            "min-h-0 flex-1",
            settings.treeMode === "hidden" && HIDDEN_TREE_CLASS
          )}
          classNames={BAR_CLASS_NAMES}
          columns={columns}
          columnsMenu={columnsMenu}
          defaultCollapsedGroups={COLLAPSED_ON_OPEN}
          defaultDate={VIEW_DATE}
          defaultScale="day"
          displayScheduleHint={settings.scheduleHints}
          dragCreate
          events={timelineBars}
          getSummaryProgress={getStageRollup}
          i18n={DEMO_I18N}
          // one board, one operations day: you step days, you do not scroll into them
          infiniteScroll={false}
          initialCenter={VIEW_DATE}
          // the primitive seeds its tree width once, so a mode change remounts
          key={settings.treeMode}
          metrics={DEMO_METRICS}
          onEventClick={handleEventClick}
          onEventsChange={handleBarsChange}
          onEventUpdate={handleStageUpdate}
          onSlotClick={handleSlotClick}
          rangeBounds={DEMO_RANGE_BOUNDS}
          renderEvent={renderStageBar}
          renderEventMenu={renderStageMenu}
          renderResourceLabel={renderStageLabel}
          resources={visibleWorkflows}
          // the graph decides row order, so reordering it would be meaningless
          rowCheckboxes={false}
          // a stage row holds every attempt and every shard of that stage, so
          // concurrent executions stack into lanes; gate rows override to "single"
          scheduleMode="multiple"
          summaryBars={settings.rollups}
          timelineLines={settings.rowLines ? "both" : "vertical"}
          treePanel={TREE_PANELS[settings.treeMode]}
        >
          {/* GanttNav owns the border and the padding, so there is no second rule */}
          <GanttNav className="border-b px-3">
            <GanttNavToday />
            <GanttNavPrev />
            <GanttNavNext />
            <GanttTitle />
            <div aria-hidden="true" className="flex-1" />
            <GanttToolbar>
              <RunBoardSettings
                dimmedStatuses={dimmedStatuses}
                hiddenWorkflows={hiddenWorkflows}
                onChange={patchSettings}
                onResetFilters={resetFilters}
                onResetView={resetView}
                onToggleStatus={toggleStatus}
                onToggleWorkflow={toggleWorkflow}
                settings={settings}
                workflowStatus={workflowStatus}
              />
              <Button
                className="gap-1.5"
                onClick={handleToolbarCreate}
                size="sm"
                type="button"
              >
                <PlusIcon aria-hidden="true" className="size-4" />
                <span className="max-sm:sr-only">Nova etapa</span>
              </Button>
            </GanttToolbar>
          </GanttNav>
          <GanttView />
        </Gantt>
      </Card>

      <StageSheet
        cutoffLabel={cutoffLabelFor(sheet?.data?.workflowId ?? "")}
        onDelete={() => {
          if (sheet?.draft.id) {
            removeBar(sheet.draft.id);
          }
        }}
        onDraftChange={(draft) =>
          setSheet((state) => (state ? { ...state, draft } : state))
        }
        onEdit={() =>
          setSheet((state) => (state ? { ...state, mode: "edit" } : state))
        }
        onOpenChange={(open) => {
          if (!open) {
            setSheet(null);
          }
        }}
        onRerun={() => {
          if (sheet?.draft.stageId) {
            rerunStage(sheet.draft.stageId);
          }
        }}
        onSave={handleSheetSave}
        slack={sheetSlack}
        stages={ALL_STAGES}
        state={sheet}
        waitsFor={sheetWaitsFor}
      />

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null);
          }
        }}
        open={confirm !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirm?.run();
                setConfirm(null);
              }}
            >
              {confirm?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { RunBoard };
