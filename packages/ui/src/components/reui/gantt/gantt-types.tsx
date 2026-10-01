// @ts-nocheck
type GanttBarId = string;

type GanttScale = "day" | "week" | "month" | "quarter" | "year";

/** Row drag-reorder proposal: `parentId` null is root, `resources` is the tree with the move applied. */
interface GanttResourceReorder {
  /** Position among the new parent's children, the moved row excluded. */
  index: number;
  parentId: string | null;
  resourceId: string;
  resources: GanttResource[];
}

/**
 * "single" keeps the node on one track and refuses any gesture that would
 * create a concurrent schedule; "multiple" stacks them into stable lanes.
 */
type GanttScheduleMode = "single" | "multiple";

/**
 * Drop policy for a gesture overlapping another schedule in the SAME node.
 * Policy only - overlapping data always renders. "allow" (default) commits as
 * proposed, "clamp" stops at the neighbour's edge, "reject" never commits.
 */
type GanttOverlapPolicy = "allow" | "reject" | "clamp";

/** Vertical placement of row content when the node holds several lanes; "start" pins it to the first lane. */
type GanttRowAlign = "start" | "center";

/** One tree node, not domain-bound: a task (one schedule) or a resource lane (many). Children nest as collapsible groups. */
interface GanttResource {
  baselineEnd?: Date;
  /**
   * Planned (as-built baseline) window for the WHOLE node, ghosted as a
   * band behind its lanes - independent of any per-event baselines. Half
   * open; set both or neither. Equal instants mark a planned milestone.
   */
  baselineStart?: Date;
  children?: GanttResource[];
  color?: string;
  id: string;
  /** Per-node cardinality; falls back to the view-level default. */
  scheduleMode?: GanttScheduleMode;
  title: string;
}

/** Preferred name for a tree node; `GanttResource` is the legacy alias. */
type GanttNode = GanttResource;

/** Half-open: `start` inclusive, `end` exclusive. */
interface GanttDateRange {
  end: Date;
  start: Date;
}

type GanttWeekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

interface GanttRecurrenceRule {
  byMonth?: number[];
  byMonthDay?: number[];
  byWeekday?: Array<GanttWeekday | { day: GanttWeekday; ordinal: number }>;
  count?: number;
  exDates?: Date[];
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  rDates?: Date[];
  /** Inclusive, unlike the exclusive `end` of a range. */
  until?: Date;
  weekStart?: GanttWeekday;
}

interface GanttEvent<TData = unknown> {
  allDay?: boolean;
  baselineEnd?: Date;
  /**
   * Planned (as-built baseline) window, drawn behind the bar so the actual
   * start/end read against it. Half-open like start/end; set both or
   * neither. Equal instants mark a planned milestone. A recurring series
   * has no single planned window, so events with `recurrence` render none.
   */
  baselineStart?: Date;
  /** Token or css color; flows to the --gantt-event-color css var. */
  color?: string;
  data?: TData;
  /**
   * Ids of the events this one waits on (finish-to-start). The view draws an
   * elbow arrow from each named event's end into this one's start; unknown
   * ids, recurring series, and endpoints on hidden rows are skipped.
   * Rendering only - the gantt never reschedules dependents; enforcement
   * stays consumer territory (canDropEvent/onEventUpdate).
   */
  dependencies?: GanttBarId[];
  draggable?: boolean;
  end: Date;
  id: GanttBarId;
  originalStart?: Date;
  /** Feeds the default getEventPriority; higher orders and packs first. */
  priority?: number;
  /** Completion 0-100, not 0-1. */
  progress?: number;
  /** Vetoes only, ANDed with interactions.drag / .resize: readOnly blocks both, draggable/resizable one each. */
  readOnly?: boolean;
  /** Structured rule or a raw "RRULE:..." line. */
  recurrence?: GanttRecurrenceRule | string;
  /** An edited single occurrence of that series; `originalStart` is the RECURRENCE-ID it replaces. */
  recurringEventId?: GanttBarId;
  resizable?: boolean;
  resourceId?: string;
  /** Plain instants, not ISO strings. `end` is exclusive and must be >= start. */
  start: Date;
  title: string;
  /** Explicit stacking override; wins over the computed z. */
  zIndex?: number;
}

interface GanttOccurrence<TData = unknown> {
  allDay: boolean;
  end: Date;
  event: GanttEvent<TData>;
  eventId: GanttBarId;
  isRecurring: boolean;
  /** Stable per instance: `${event.id}::${startISO}`. */
  key: string;
  recurrenceIndex?: number;
  start: Date;
}

interface GanttSegment<TData = unknown> {
  /** Lane packing: 0-based lane index, then the lanes the node's row resolved to. */
  column?: number;
  columnCount?: number;
  columnSpan?: number;
  continuesAfter: boolean;
  continuesBefore: boolean;
  /** Range-start reference instant of the segment's timeline slice. */
  day: Date;
  endMin?: number;
  isEnd: boolean;
  isStart: boolean;
  occurrence: GanttOccurrence<TData>;
  /** Minutes from the visible range start, clamped to the range. */
  startMin?: number;
}

/** A validated planned window; `milestone` when start and end coincide. */
interface GanttBaseline {
  end: Date;
  milestone: boolean;
  start: Date;
}

/** Actual end against the planned end: before it, after it, or exactly on it. */
type GanttBaselineVariance = "early" | "late" | "on-time";

interface GanttSelection {
  eventKeys: string[];
  slot: { start: Date; end: Date; allDay: boolean } | null;
}

interface GanttInteractions {
  /** Horizontal move within the bar's own row; never across rows. */
  drag: boolean;
  resize: boolean;
  selectSlot: boolean;
}

interface GanttDragState<TData = unknown> {
  kind: "move" | "resize-start" | "resize-end";
  occurrence: GanttOccurrence<TData>;
  proposedAllDay: boolean;
  proposedEnd: Date;
  proposedResourceId?: string;
  proposedStart: Date;
  /** Last canDropEvent verdict; drives data-drop-invalid styling. */
  valid: boolean;
}

/** The in-gesture drag-create rectangle only; the committed slot is GanttSelection.slot. */
interface GanttSlotDraft {
  allDay: boolean;
  end: Date;
  resourceId?: string;
  start: Date;
}

interface GanttState<TData = unknown> {
  activeRange: GanttDateRange;
  date: Date;
  drag: GanttDragState<TData> | null;
  events: GanttEvent<TData>[];
  interactions: GanttInteractions;
  loading: boolean;
  scale: GanttScale;
  selection: GanttSelection;
  slotDraft: GanttSlotDraft | null;
  /** Center of the scrolled viewport; the nav title follows it. null falls back to the anchor date. */
  viewportCenter: Date | null;
  /** Full rendered axis range - fetch remote data for THIS, not for activeRange (the logical month/week). */
  visibleRange: GanttDateRange;
}

interface GanttRangeInfo {
  activeRange: GanttDateRange;
  date: Date;
  range: GanttDateRange;
  scale: GanttScale;
  timeZone: string;
}

interface GanttProposedUpdate<TData = unknown> {
  allDay: boolean;
  end: Date;
  event: GanttEvent<TData>;
  /** null when source === "api". */
  occurrence: GanttOccurrence<TData> | null;
  resourceId?: string;
  source: "drag" | "resize-start" | "resize-end" | "keyboard" | "api";
  start: Date;
}

/** false = reject/revert; void or true = accept; object = accept with adjustment. */
type GanttUpdateResult =
  | boolean
  | void
  | { start?: Date; end?: Date; allDay?: boolean };

/** A click is a point, not a range; `end` is reserved for future gestures. */
interface GanttSlotInfo {
  allDay: boolean;
  date: Date;
  end?: Date;
  resourceId?: string;
}

/** Off-day marking; `true` takes the defaults. Marked cells carry `data-off` for CSS customization. */
interface GanttOffDaysConfig {
  /** Marker classes; default "bg-muted/40". */
  className?: string;
  /** Extra off dates compared by day in the display zone. */
  dates?: Date[];
  /** Runs in addition to weekendDays and dates, not instead; any match marks the day off. */
  isOffDay?: (day: Date) => boolean;
  /** Weekday numbers treated as off (0 = Sunday). Default [0, 6]. */
  weekendDays?: number[];
}

/** External-data contract; OAuth, tokens, and sync loops are application backend territory. */
interface GanttDataAdapter<TData = unknown> {
  getEvents(
    range: GanttDateRange,
    signal?: AbortSignal
  ): Promise<GanttEvent<TData>[]>;
}

export type {
  GanttBarId,
  GanttBaseline,
  GanttBaselineVariance,
  GanttDataAdapter,
  GanttDateRange,
  GanttDragState,
  GanttEvent,
  GanttInteractions,
  GanttNode,
  GanttOccurrence,
  GanttOffDaysConfig,
  GanttOverlapPolicy,
  GanttProposedUpdate,
  GanttRangeInfo,
  GanttRecurrenceRule,
  GanttResource,
  GanttResourceReorder,
  GanttRowAlign,
  GanttScale,
  GanttScheduleMode,
  GanttSegment,
  GanttSelection,
  GanttSlotDraft,
  GanttSlotInfo,
  GanttState,
  GanttUpdateResult,
  GanttWeekday,
};
