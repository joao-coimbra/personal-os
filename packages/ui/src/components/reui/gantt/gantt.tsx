"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  type GanttI18nConfig,
  type GanttI18nOverrides,
  mergeGanttI18n,
} from "@personal-os/ui/components/reui/gantt/gantt-i18n";
import {
  buildEventIndex,
  defaultEventOrder,
  eventsOverlap,
  findResource,
  type GanttIndex,
  getGanttDateRange,
  getRangeKey,
  stepGanttDate,
  toZoned,
  type WeekStartsOn,
} from "@personal-os/ui/components/reui/gantt/gantt-lib";
import type {
  GanttBarId,
  GanttBaseline,
  GanttBaselineVariance,
  GanttDateRange,
  GanttDragState,
  GanttEvent,
  GanttInteractions,
  GanttOccurrence,
  GanttOffDaysConfig,
  GanttOverlapPolicy,
  GanttProposedUpdate,
  GanttRangeInfo,
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
} from "@personal-os/ui/components/reui/gantt/gantt-types";
import { cn } from "cn";
import type { Locale } from "date-fns";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const DEFAULT_INTERACTIONS: GanttInteractions = {
  drag: true,
  resize: true,
  selectSlot: true,
};

/** Infinite-scroll growth cap, in whole periods per side. */
const MAX_RANGE_WINDOW = 12;

/** A node holds as many concurrent schedules as it needs unless told otherwise. */
const DEFAULT_SCHEDULE_MODE: GanttScheduleMode = "multiple";

/** Tree label sits on the first schedule's baseline, not the grown row's middle. */
const DEFAULT_ROW_ALIGN: GanttRowAlign = "start";

/**
 * A node's cardinality: its own override wins over the view-level default.
 * Shared by the layout pass and the gesture engine so both read one rule.
 */
function resolveScheduleMode(
  node: GanttResource | null | undefined,
  scheduleMode: GanttScheduleMode | undefined
): GanttScheduleMode {
  return node?.scheduleMode ?? scheduleMode ?? DEFAULT_SCHEDULE_MODE;
}

const EMPTY_SELECTION: GanttSelection = { eventKeys: [], slot: null };

interface GanttCallbacks<TData = unknown> {
  /**
   * Gates the "add task" hint. The shipped view offers root-level creation
   * only (parentId = null); parentId stays in the contract for group-level
   * affordances a consumer builds via its own UI + onCreateTask.
   */
  canCreateTask?: (ctx: { parentId: string | null }) => boolean;
  canDropEvent?: (update: GanttProposedUpdate<TData>) => boolean;
  /** Live validity predicate while a resource row is being dragged. */
  canReorderResource?: (proposal: GanttResourceReorder) => boolean;
  canSelectSlot?: (slot: GanttSlotDraft) => boolean;
  /** Fires when the "add task" hint is activated; create a new tree row. */
  onCreateTask?: (ctx: { parentId: string | null; index: number }) => void;
  onDateChange?: (date: Date) => void;
  onEventClick?: (
    occurrence: GanttOccurrence<TData>,
    e: React.MouseEvent
  ) => void;
  onEventDoubleClick?: (
    occurrence: GanttOccurrence<TData>,
    e: React.MouseEvent
  ) => void;
  onEventsChange?: (events: GanttEvent<TData>[]) => void;
  onEventUpdate?: (update: GanttProposedUpdate<TData>) => GanttUpdateResult;
  onInteractionsChange?: (interactions: GanttInteractions) => void;
  onRangeChange?: (info: GanttRangeInfo) => void;
  /** Click on a tree row's surface (chevron/checkbox/grip clicks excluded). */
  onResourceClick?: (ctx: GanttColumnContext, e: React.MouseEvent) => void;
  onResourceDoubleClick?: (
    ctx: GanttColumnContext,
    e: React.MouseEvent
  ) => void;
  /**
   * Commit gate for timeline resource-row drag reorder. Return false to
   * reject; apply the move by adopting proposal.resources into your
   * `resources` state (controlled - the calendar never self-mutates).
   */
  onResourceReorder?: (proposal: GanttResourceReorder) => void | false;
  /**
   * Fires when a reorder gesture is released on a position rejected by
   * `canReorderResource` (e.g. a pinned row). Use it to explain the rejection
   * (a toast) - the destructive drop indicator already shows it live.
   */
  onResourceReorderReject?: (proposal: GanttResourceReorder) => void;
  onScaleChange?: (scale: GanttScale) => void;
  onSelectionChange?: (selection: GanttSelection) => void;
  onSelectSlot?: (slot: GanttSlotDraft) => void;
  onSlotClick?: (slot: GanttSlotInfo, e: React.MouseEvent) => void;
}

interface UseGanttStateOptions<TData = unknown> extends GanttCallbacks<TData> {
  /** Pointer-activation threshold overrides for drag/resize/create. */
  activation?: GanttActivationConfig;
  date?: Date;
  defaultDate?: Date;
  defaultEvents?: GanttEvent<TData>[];
  defaultInteractions?: Partial<GanttInteractions>;
  defaultScale?: GanttScale;
  defaultSelection?: GanttSelection;
  /**
   * Make canDropEvent binding: releasing a gesture whose last verdict was
   * invalid reverts it, like the "reject" overlap policy, instead of
   * committing anyway. Default false - canDropEvent alone stays advisory
   * (it styles the ghost; onEventUpdate is the commit gate).
   */
  enforceCanDrop?: boolean;
  eventOrder?: (a: GanttOccurrence<TData>, b: GanttOccurrence<TData>) => number;
  events?: GanttEvent<TData>[];
  getEventPriority?: (event: GanttEvent<TData>) => number;
  getOccurrences?: (
    event: GanttEvent<TData>,
    range: GanttDateRange,
    ctx: { timeZone: string }
  ) => Array<{ start: Date; end: Date }> | null;
  i18n?: GanttI18nOverrides;
  interactions?: Partial<GanttInteractions>;
  loading?: boolean;
  locale?: Locale;
  /**
   * Infinite-scroll growth cap in whole periods per side; past it the
   * anchor slides instead (DOM stays bounded). Default 12.
   */
  maxRangeWindow?: number;
  /**
   * What a gesture may do when it would overlap another schedule in the SAME
   * node: "allow" (default), "clamp" to the neighbour's edge, or "reject".
   * Policy only - overlapping data always renders. A node in "single"
   * scheduleMode rejects regardless.
   */
  overlap?: GanttOverlapPolicy;
  /**
   * Hard travel bounds for infinite scrolling; either side may be omitted
   * for unlimited travel in that direction.
   */
  rangeBounds?: { min?: Date; max?: Date };
  /** Tree nodes of the gantt (GanttNode is the preferred type name). */
  resources?: GanttResource[];
  scale?: GanttScale;
  selection?: GanttSelection;
  slotDuration?: number;
  snapDuration?: number;
  timeZone?: string;
  weekStartsOn?: WeekStartsOn;
}

/**
 * Resolved configuration: every UseGanttStateOptions field except the
 * controlled/uncontrolled state pairs, with defaults applied and i18n merged.
 * Read via ref semantics - callback identity changes never re-render the grid.
 */
interface GanttSettings<TData = unknown> extends GanttCallbacks<TData> {
  activation?: GanttActivationConfig;
  enforceCanDrop?: boolean;
  eventOrder: (a: GanttOccurrence<TData>, b: GanttOccurrence<TData>) => number;
  getEventPriority: (event: GanttEvent<TData>) => number;
  getOccurrences?: (
    event: GanttEvent<TData>,
    range: GanttDateRange,
    ctx: { timeZone: string }
  ) => Array<{ start: Date; end: Date }> | null;
  i18n: GanttI18nConfig;
  locale?: Locale;
  maxRangeWindow?: number;
  overlap: GanttOverlapPolicy;
  rangeBounds?: { min?: Date; max?: Date };
  resources: GanttResource[];
  slotDuration: number;
  snapDuration: number;
  timeZone: string;
  weekStartsOn: WeekStartsOn;
}

interface GanttApi<TData = unknown> {
  addEvent(event: GanttEvent<TData>): void;
  clearSelection(): void;
  findOverlapping(candidate: {
    start: Date;
    end: Date;
    excludeEventId?: string;
  }): GanttOccurrence<TData>[];
  getActiveRange(): GanttDateRange;
  getEvent(id: GanttBarId): GanttEvent<TData> | undefined;
  getEvents(): GanttEvent<TData>[];
  getOccurrences(range?: GanttDateRange): GanttOccurrence<TData>[];
  getVisibleRange(): GanttDateRange;
  goTo(date: Date): void;
  next(): void;
  prev(): void;
  removeEvent(id: GanttBarId): void;
  select(selection: Partial<GanttSelection>): void;
  selectEvent(key: string, opts?: { additive?: boolean }): void;
  setEvents(events: GanttEvent<TData>[]): void;
  setInteractions(patch: Partial<GanttInteractions>): void;
  setScale(scale: GanttScale): void;
  today(): void;
  /** TZDate in the gantt's display time zone. */
  toZoned(date: Date): Date;
  updateEvent(id: GanttBarId, patch: Partial<GanttEvent<TData>>): void;
}

/** Cross-file plumbing for sibling view/interaction modules; not public API. */
interface GanttInternals<TData = unknown> {
  applyProposedUpdate(update: GanttProposedUpdate<TData>): boolean;
  /**
   * True when the LAST anchor-date change was an extendRange window slide
   * (not a navigation) - the view keeps its scroll guard across slides.
   */
  didAnchorSlide(): boolean;
  /**
   * Grow visibleRange by whole periods for infinite scrolling; resets on
   * date/scale changes. Returns false once the growth cap is reached.
   */
  extendRange(direction: "before" | "after"): boolean;
  getIndex(): GanttIndex<TData>;
  getSettingsVersion(): number;
  setDrag(drag: GanttDragState<TData> | null): void;
  setSlotDraft(draft: GanttSlotDraft | null): void;
  /** View reports the visible-center instant (or null) for the nav title. */
  setViewportCenter(date: Date | null): void;
}

interface GanttInstance<TData = unknown> {
  api: GanttApi<TData>;
  getState(): GanttState<TData>;
  internals: GanttInternals<TData>;
  settings: GanttSettings<TData>;
  subscribe(listener: () => void): () => void;
}

function resolveSettings<TData>(
  options: UseGanttStateOptions<TData>
): GanttSettings<TData> {
  const {
    // strip state pairs; the rest flows into settings
    events: _e,
    defaultEvents: _de,
    scale: _v,
    defaultScale: _dv,
    date: _d,
    defaultDate: _dd,
    selection: _s,
    defaultSelection: _ds,
    interactions: _i,
    defaultInteractions: _di,
    loading: _l,
    ...rest
  } = options;
  const getEventPriority =
    options.getEventPriority ??
    ((event: GanttEvent<TData>) => event.priority ?? 0);
  return {
    ...rest,
    // priority-aware default: higher getEventPriority packs/orders first
    eventOrder:
      options.eventOrder ??
      ((a, b) =>
        getEventPriority(b.event) - getEventPriority(a.event) ||
        defaultEventOrder(a, b)),
    getEventPriority,
    getOccurrences: options.getOccurrences,
    i18n: mergeGanttI18n(options.i18n),
    locale: options.locale,
    overlap: options.overlap ?? "allow",
    rangeBounds: options.rangeBounds,
    resources: options.resources ?? [],
    slotDuration: options.slotDuration ?? 30,
    snapDuration: options.snapDuration ?? 15,
    timeZone:
      options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    // locale-first default: a de/fr locale gets Monday weeks without also
    // having to set weekStartsOn; an explicit weekStartsOn always wins
    weekStartsOn:
      options.weekStartsOn ?? options.locale?.options?.weekStartsOn ?? 0,
  };
}

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (process.env.NODE_ENV !== "production" && !warned.has(key)) {
    warned.add(key);
    console.warn(`[gantt] ${message}`);
  }
}

interface GanttStore<TData> {
  emitRangeIfChanged(): void;
  instance: GanttInstance<TData>;
  notify(): void;
  setOptions(next: UseGanttStateOptions<TData>): boolean;
}

function createGanttStore<TData>(
  initial: UseGanttStateOptions<TData>
): GanttStore<TData> {
  let options = initial;
  let settings = resolveSettings(initial);
  let settingsVersion = 0;

  const listeners = new Set<() => void>();

  const internal = {
    date: initial.defaultDate ?? new Date(),
    drag: null as GanttDragState<TData> | null,
    events: initial.defaultEvents ?? [],
    interactions: { ...DEFAULT_INTERACTIONS, ...initial.defaultInteractions },
    /** Whole extra periods rendered on each side (infinite scroll). */
    rangeWindow: { after: 0, before: 0 },
    scale: initial.defaultScale ?? "day",
    selection: initial.defaultSelection ?? EMPTY_SELECTION,
    slotDraft: null as GanttSlotDraft | null,
    /** Visible-center instant reported by the view; drives the nav title. */
    viewportCenter: null as Date | null,
  };

  let snapshot: GanttState<TData> | null = null;
  let indexCache: {
    events: GanttEvent<TData>[];
    rangeKey: string;
    timeZone: string;
    index: GanttIndex<TData>;
  } | null = null;
  let lastEmittedRangeKey: string | null = null;
  /** Whether the last anchor change came from an extendRange window slide. */
  let lastAnchorChangeWasSlide = false;

  const invalidate = () => {
    snapshot = null;
  };

  const notify = () => {
    listeners.forEach((listener) => listener());
    emitRangeIfChanged();
  };

  const getState = (): GanttState<TData> => {
    if (snapshot) {
      return snapshot;
    }
    const scale = options.scale ?? internal.scale;
    const date = options.date ?? internal.date;
    const rangeOpts = {
      timeZone: settings.timeZone,
      weekStartsOn: settings.weekStartsOn,
    };
    const { visibleRange: baseRange, activeRange } = getGanttDateRange(
      scale,
      date,
      rangeOpts
    );
    // Infinite scroll: widen by whole periods; the anchor period stays put
    const { before, after } = internal.rangeWindow;
    let visibleRange = baseRange;
    if (before > 0 || after > 0) {
      let earlier = date;
      for (let i = 0; i < before; i++) {
        earlier = stepGanttDate(scale, earlier, -1, rangeOpts);
      }
      let later = date;
      for (let i = 0; i < after; i++) {
        later = stepGanttDate(scale, later, 1, rangeOpts);
      }
      visibleRange = {
        end: getGanttDateRange(scale, later, rangeOpts).visibleRange.end,
        start: getGanttDateRange(scale, earlier, rangeOpts).visibleRange.start,
      };
    }
    snapshot = {
      activeRange,
      date,
      drag: internal.drag,
      events: options.events ?? internal.events,
      interactions: options.interactions
        ? { ...DEFAULT_INTERACTIONS, ...options.interactions }
        : internal.interactions,
      loading: options.loading ?? false,
      scale,
      selection: options.selection ?? internal.selection,
      slotDraft: internal.slotDraft,
      viewportCenter: internal.viewportCenter,
      visibleRange,
    };
    return snapshot;
  };

  const emitRangeIfChanged = () => {
    if (!settings.onRangeChange) {
      return;
    }
    const state = getState();
    const key = `${state.scale}:${getRangeKey(state.visibleRange)}:${settings.timeZone}`;
    if (key === lastEmittedRangeKey) {
      return;
    }
    lastEmittedRangeKey = key;
    settings.onRangeChange({
      activeRange: state.activeRange,
      date: state.date,
      range: state.visibleRange,
      scale: state.scale,
      timeZone: settings.timeZone,
    });
  };

  type ControlledKey =
    | "scale"
    | "date"
    | "events"
    | "selection"
    | "interactions";

  const setField = <K extends ControlledKey>(
    key: K,
    value: GanttState<TData>[K extends "events" ? "events" : K]
  ) => {
    const controlled = options[key] !== undefined;
    if (key === "date" || key === "scale") {
      // value-equal sets are no-ops: they must not touch store state (the
      // controlled path would mutate without notify) nor drop infinite-
      // scroll growth for a navigation that never happened
      const current = getState()[key];
      const same =
        key === "date"
          ? (current as Date).getTime() === (value as Date).getTime()
          : current === value;
      if (same) {
        return;
      }
      // navigating re-anchors the axis; drop any infinite-scroll growth and
      // let the title follow the anchor again until the user scrolls
      internal.rangeWindow = { after: 0, before: 0 };
      internal.viewportCenter = null;
      lastAnchorChangeWasSlide = false;
      invalidate();
    }
    if (!controlled) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (internal as any)[key] = value;
      invalidate();
    }
    const callbacks: Record<ControlledKey, ((v: never) => void) | undefined> = {
      date: settings.onDateChange as never,
      events: settings.onEventsChange as never,
      interactions: settings.onInteractionsChange as never,
      scale: settings.onScaleChange as never,
      selection: settings.onSelectionChange as never,
    };
    callbacks[key]?.(value as never);
    if (!controlled) {
      notify();
    }
  };

  const applyProposedUpdate = (
    update: GanttProposedUpdate<TData>,
    // extra non-timing fields committed in the SAME events emission: a second
    // setField pass would read stale controlled options.events and emit an
    // array without the timing change
    extra?: Partial<GanttEvent<TData>>
  ): boolean => {
    const result = settings.onEventUpdate?.(update);
    if (result === false) {
      return false;
    }
    const adjusted: Partial<GanttEvent<TData>> =
      result && typeof result === "object"
        ? {
            allDay: result.allDay ?? update.allDay,
            end: result.end ?? update.end,
            start: result.start ?? update.start,
          }
        : { allDay: update.allDay, end: update.end, start: update.start };
    if (update.resourceId !== undefined) {
      adjusted.resourceId = update.resourceId;
    }
    const merged = extra ? { ...extra, ...adjusted } : adjusted;
    const events = getState().events;
    const next = events.map((event) =>
      event.id === update.event.id ? { ...event, ...merged } : event
    );
    setField("events", next);
    return true;
  };

  const getIndex = (): GanttIndex<TData> => {
    const state = getState();
    const rangeKey = getRangeKey(state.visibleRange);
    if (
      indexCache &&
      indexCache.events === state.events &&
      indexCache.rangeKey === rangeKey &&
      indexCache.timeZone === settings.timeZone
    ) {
      return indexCache.index;
    }
    const index = buildEventIndex(state.events, state.visibleRange, {
      eventOrder: settings.eventOrder,
      getOccurrences: settings.getOccurrences,
      timeZone: settings.timeZone,
    });
    indexCache = {
      events: state.events,
      index,
      rangeKey,
      timeZone: settings.timeZone,
    };
    return index;
  };

  /** Anchor clamp: navigation may never leave the configured bounds. */
  const clampToBounds = (date: Date): Date => {
    const bounds = settings.rangeBounds;
    if (!bounds) {
      return date;
    }
    if (bounds.min && date.getTime() < bounds.min.getTime()) {
      return bounds.min;
    }
    if (bounds.max && date.getTime() > bounds.max.getTime()) {
      return bounds.max;
    }
    return date;
  };

  const api: GanttApi<TData> = {
    addEvent(event) {
      setField("events", [...getState().events, event]);
    },
    clearSelection() {
      setField("selection", EMPTY_SELECTION);
    },
    findOverlapping({ start, end, excludeEventId }) {
      return api
        .getOccurrences({ end, start })
        .filter((occ) => occ.eventId !== excludeEventId);
    },
    getActiveRange() {
      return getState().activeRange;
    },
    getEvent(id) {
      return getState().events.find((event) => event.id === id);
    },
    getEvents() {
      return getState().events;
    },
    getOccurrences(range) {
      if (!range) {
        return getIndex().occurrences;
      }
      const state = getState();
      const within =
        range.start >= state.visibleRange.start &&
        range.end <= state.visibleRange.end;
      if (within) {
        return getIndex().occurrences.filter((occ) =>
          eventsOverlap(occ, range)
        );
      }
      return buildEventIndex(state.events, range, {
        eventOrder: settings.eventOrder,
        getOccurrences: settings.getOccurrences,
        timeZone: settings.timeZone,
      }).occurrences;
    },
    getVisibleRange() {
      return getState().visibleRange;
    },
    goTo(date) {
      setField("date", clampToBounds(date));
    },
    next() {
      const state = getState();
      setField(
        "date",
        clampToBounds(
          stepGanttDate(state.scale, state.date, 1, {
            timeZone: settings.timeZone,
          })
        )
      );
    },
    prev() {
      const state = getState();
      setField(
        "date",
        clampToBounds(
          stepGanttDate(state.scale, state.date, -1, {
            timeZone: settings.timeZone,
          })
        )
      );
    },
    removeEvent(id) {
      setField(
        "events",
        getState().events.filter((event) => event.id !== id)
      );
    },
    select(partial) {
      const current = getState().selection;
      setField("selection", {
        eventKeys: partial.eventKeys ?? current.eventKeys,
        slot: partial.slot === undefined ? current.slot : partial.slot,
      });
    },
    selectEvent(key, opts) {
      const current = getState().selection;
      const eventKeys = opts?.additive
        ? current.eventKeys.includes(key)
          ? current.eventKeys.filter((k) => k !== key)
          : [...current.eventKeys, key]
        : [key];
      setField("selection", { ...current, eventKeys });
    },
    setEvents(events) {
      setField("events", events);
    },
    setInteractions(patch) {
      setField("interactions", { ...getState().interactions, ...patch });
    },
    setScale(scale) {
      setField("scale", scale);
    },
    today() {
      setField("date", clampToBounds(new Date()));
    },
    toZoned(date) {
      return toZoned(date, settings.timeZone);
    },
    updateEvent(id, patch) {
      const event = api.getEvent(id);
      if (!event) {
        return;
      }
      const merged = { ...event, ...patch };
      const timingChanged =
        patch.start !== undefined ||
        patch.end !== undefined ||
        patch.allDay !== undefined;
      if (timingChanged && settings.onEventUpdate) {
        // timing + rest commit as ONE events emission (a rejected update
        // drops the whole patch, same as before)
        const rest = { ...patch };
        delete rest.start;
        delete rest.end;
        delete rest.allDay;
        applyProposedUpdate(
          {
            allDay: merged.allDay ?? false,
            end: merged.end,
            event: merged,
            occurrence: null,
            source: "api",
            start: merged.start,
          },
          Object.keys(rest).length > 0 ? rest : undefined
        );
        return;
      }
      setField(
        "events",
        getState().events.map((e) => (e.id === id ? merged : e))
      );
    },
  };

  const internals: GanttInternals<TData> = {
    applyProposedUpdate,
    didAnchorSlide() {
      return lastAnchorChangeWasSlide;
    },
    extendRange(direction) {
      const state = getState();
      const bounds = settings.rangeBounds;
      if (
        direction === "before" &&
        bounds?.min &&
        state.visibleRange.start.getTime() <= bounds.min.getTime()
      ) {
        return false;
      }
      if (
        direction === "after" &&
        bounds?.max &&
        state.visibleRange.end.getTime() >= bounds.max.getTime()
      ) {
        return false;
      }
      const cap = Math.max(1, settings.maxRangeWindow ?? MAX_RANGE_WINDOW);
      const { before, after } = internal.rangeWindow;
      const grow = direction === "before" ? before < cap : after < cap;
      if (grow) {
        internal.rangeWindow =
          direction === "before"
            ? { after, before: before + 1 }
            : { after: after + 1, before };
      } else {
        // window is at capacity: SLIDE the anchor one period instead, so
        // travel stays unbounded while the DOM stays bounded
        const next = stepGanttDate(
          state.scale,
          state.date,
          direction === "before" ? -1 : 1,
          {
            timeZone: settings.timeZone,
          }
        );
        if (options.date !== undefined) {
          // controlled anchor: propose the slide; nothing changes until the
          // parent adopts it
          settings.onDateChange?.(next);
          return false;
        }
        internal.date = next;
        lastAnchorChangeWasSlide = true;
        settings.onDateChange?.(next);
      }
      invalidate();
      notify();
      return true;
    },
    getIndex,
    getSettingsVersion() {
      return settingsVersion;
    },
    setDrag(drag) {
      internal.drag = drag;
      invalidate();
      notify();
    },
    setSlotDraft(draft) {
      internal.slotDraft = draft;
      invalidate();
      notify();
    },
    setViewportCenter(date) {
      const prev = internal.viewportCenter;
      if (prev?.getTime() === date?.getTime()) {
        return;
      }
      internal.viewportCenter = date;
      invalidate();
      notify();
    },
  };

  const instance: GanttInstance<TData> = {
    api,
    getState,
    internals,
    get settings() {
      return settings;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  const STATE_KEYS = [
    "events",
    "scale",
    "date",
    "selection",
    "interactions",
    "loading",
  ] as const;
  const SETTINGS_KEYS = [
    "timeZone",
    "locale",
    "weekStartsOn",
    "slotDuration",
    "snapDuration",
    "i18n",
    "rangeBounds",
    "activation",
    "maxRangeWindow",
    "resources",
    "overlap",
    "enforceCanDrop",
    "getEventPriority",
    "eventOrder",
    "getOccurrences",
  ] as const;

  return {
    emitRangeIfChanged,
    instance,
    notify,
    setOptions(next) {
      const prev = options;
      options = next;
      // compare by value: a freshly constructed but equal controlled date
      // must not wipe infinite-scroll growth on every parent re-render
      if (
        prev.date?.getTime() !== next.date?.getTime() ||
        prev.scale !== next.scale
      ) {
        internal.rangeWindow = { after: 0, before: 0 };
        lastAnchorChangeWasSlide = false;
      }
      let changed = false;
      for (const key of STATE_KEYS) {
        if (prev[key] !== next[key]) {
          changed = true;
          break;
        }
      }
      let settingsChanged = false;
      for (const key of SETTINGS_KEYS) {
        if (prev[key] !== next[key]) {
          settingsChanged = true;
          break;
        }
      }
      settings = resolveSettings(next);
      if (settingsChanged) {
        settingsVersion++;
        changed = true;
      }
      if (changed) {
        invalidate();
      }
      return changed;
    },
  };
}

/**
 * Headless root hook - the full calendar engine without any markup.
 * Pass the returned instance to <Gantt calendar={instance}> or drive
 * fully custom UI from instance.getState()/subscribe/api.
 */
function useGanttState<TData = unknown>(
  options: UseGanttStateOptions<TData> = {}
): GanttInstance<TData> {
  const [store] = useState(() => createGanttStore<TData>(options));
  const changed = store.setOptions(options);
  const changedRef = useRef(false);
  if (changed) {
    changedRef.current = true;
  }
  useLayoutEffect(() => {
    if (changedRef.current) {
      changedRef.current = false;
      store.notify();
    }
  });
  useEffect(() => {
    store.emitRangeIfChanged();
    // mount-only: onRangeChange fires once for the initial range
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return store.instance;
}

const GanttContext =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createContext<GanttInstance<any> | null>(null);

/** The stable calendar instance; throws outside <Gantt>. */
function useGantt<TData = unknown>(): GanttInstance<TData> {
  const instance = useContext(GanttContext);
  if (!instance) {
    throw new Error("useGantt must be used within <Gantt>");
  }
  return instance as GanttInstance<TData>;
}

interface UseGanttSelectorOptions<TData, TSelected> {
  calendar?: GanttInstance<TData>;
  isEqual?: (a: TSelected, b: TSelected) => boolean;
}

/** Fine-grained subscription with equality memoization (Object.is default). */
function useGanttSelector<TData = unknown, TSelected = unknown>(
  selector: (state: GanttState<TData>) => TSelected,
  options?: UseGanttSelectorOptions<TData, TSelected>
): TSelected {
  const contextInstance = useContext(GanttContext);
  const instance = options?.calendar ?? contextInstance;
  if (!instance) {
    throw new Error(
      "useGanttSelector needs an <Gantt> ancestor or an explicit `calendar` option"
    );
  }
  const isEqual = options?.isEqual ?? Object.is;
  const lastRef = useRef<{ value: TSelected } | null>(null);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSnapshot = () => {
    const next = selectorRef.current(instance.getState() as GanttState<TData>);
    if (lastRef.current && isEqual(lastRef.current.value, next)) {
      return lastRef.current.value;
    }
    lastRef.current = { value: next };
    return next;
  };

  return useSyncExternalStore(instance.subscribe, getSnapshot, getSnapshot);
}

function useGanttScale(): {
  scale: GanttScale;
  setScale: (scale: GanttScale) => void;
} {
  const instance = useGantt();
  const scale = useGanttSelector((state) => state.scale);
  return { scale, setScale: instance.api.setScale };
}

function useGanttNavigation(): {
  date: Date;
  /** i18n.functions.formatTitle output for the current view. */
  title: string;
  visibleRange: GanttDateRange;
  activeRange: GanttDateRange;
  next: () => void;
  prev: () => void;
  today: () => void;
  goTo: (date: Date) => void;
  /** True when the anchor period contains now in the display time zone. */
  isToday: boolean;
} {
  const instance = useGantt();
  const { settings } = instance;
  const slice = useGanttSelector(
    (state) => ({
      activeRange: state.activeRange,
      date: state.date,
      scale: state.scale,
      viewportCenter: state.viewportCenter,
      visibleRange: state.visibleRange,
    }),
    {
      isEqual: (a, b) =>
        a.date.getTime() === b.date.getTime() &&
        a.scale === b.scale &&
        a.viewportCenter?.getTime() === b.viewportCenter?.getTime() &&
        getRangeKey(a.visibleRange) === getRangeKey(b.visibleRange),
    }
  );
  useGanttSettingsVersion(instance);
  const now = new Date();
  // The title names what you are LOOKING at: the visible-center period when
  // the view reports one, otherwise the anchor period.
  const titleDate = slice.viewportCenter ?? slice.date;
  const titleActive = slice.viewportCenter
    ? getGanttDateRange(slice.scale, slice.viewportCenter, {
        timeZone: settings.timeZone,
        weekStartsOn: settings.weekStartsOn,
      }).activeRange
    : slice.activeRange;
  return {
    activeRange: slice.activeRange,
    date: slice.date,
    goTo: instance.api.goTo,
    isToday: now >= slice.activeRange.start && now < slice.activeRange.end,
    next: instance.api.next,
    prev: instance.api.prev,
    title: settings.i18n.functions.formatTitle(slice.scale, {
      activeRange: titleActive,
      date: toZoned(titleDate, settings.timeZone),
      locale: settings.locale,
      visibleRange: slice.visibleRange,
    }),
    today: instance.api.today,
    visibleRange: slice.visibleRange,
  };
}

function useGanttSelection(): {
  selection: GanttSelection;
  select: (selection: Partial<GanttSelection>) => void;
  selectEvent: (key: string, opts?: { additive?: boolean }) => void;
  clearSelection: () => void;
} {
  const instance = useGantt();
  const selection = useGanttSelector((state) => state.selection);
  return {
    clearSelection: instance.api.clearSelection,
    select: instance.api.select,
    selectEvent: instance.api.selectEvent,
    selection,
  };
}

function useGanttInteractions(): {
  interactions: GanttInteractions;
  setInteractions: (patch: Partial<GanttInteractions>) => void;
} {
  const instance = useGantt();
  const interactions = useGanttSelector((state) => state.interactions);
  return { interactions, setInteractions: instance.api.setInteractions };
}

/** Expanded, sorted occurrences; defaults to the visible range. */
function useGanttOccurrences<TData = unknown>(
  range?: GanttDateRange
): GanttOccurrence<TData>[] {
  const instance = useGantt<TData>();
  return useGanttSelector<TData, GanttOccurrence<TData>[]>(
    () => instance.api.getOccurrences(range),
    {
      calendar: instance,
      // keys encode id + start only, so end edits (resize-end) and payload
      // changes (title, color, progress) must be compared explicitly
      isEqual: (a, b) =>
        a.length === b.length &&
        a.every(
          (occ, i) =>
            occ.key === b[i]?.key &&
            occ.end.getTime() === b[i].end.getTime() &&
            occ.event === b[i].event
        ),
    }
  );
}

interface GanttNodeSchedules<TData = unknown> {
  /** Pairs of the node's schedules that overlap in time. */
  conflicts: Array<[GanttOccurrence<TData>, GanttOccurrence<TData>]>;
  /** The node itself, or null when the id is not in the tree. */
  node: GanttResource | null;
  /** Cardinality in force for this node (its own override, else the default). */
  scheduleMode: GanttScheduleMode;
  /** The node's occurrences in the visible range, in axis order. */
  schedules: GanttOccurrence<TData>[];
}

/**
 * Everything a consumer needs to MANAGE one node's schedules without
 * re-deriving layout: the node, its resolved cardinality, its schedules in
 * order, and the pairs that collide. Pure state - it renders nothing, so a
 * "manage schedules" panel is entirely the consumer's design.
 */
function useGanttNodeSchedules<TData = unknown>(
  nodeId: string
): GanttNodeSchedules<TData> {
  const settings = useGanttSettings<TData>();
  const viewConfig = useGanttViewConfig<TData>();
  const occurrences = useGanttOccurrences<TData>();

  const node = findResource(settings.resources, nodeId);
  const schedules = occurrences.filter(
    (occurrence) => occurrence.event.resourceId === nodeId
  );
  const conflicts: Array<[GanttOccurrence<TData>, GanttOccurrence<TData>]> = [];
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      if (eventsOverlap(schedules[i], schedules[j])) {
        conflicts.push([schedules[i], schedules[j]]);
      }
    }
  }
  return {
    conflicts,
    node,
    scheduleMode: resolveScheduleMode(node, viewConfig.scheduleMode),
    schedules,
  };
}

/** Subscribes to settings changes only (version counter, not state). */
function useGanttSettingsVersion<TData>(
  instance: GanttInstance<TData>
): number {
  return useSyncExternalStore(
    instance.subscribe,
    instance.internals.getSettingsVersion,
    instance.internals.getSettingsVersion
  );
}

/** Resolved settings incl. merged i18n; re-renders only when settings change. */
function useGanttSettings<TData = unknown>(): GanttSettings<TData> {
  const instance = useGantt<TData>();
  useGanttSettingsVersion(instance);
  return instance.settings;
}

interface GanttClassNames {
  /** The planned-window (baseline) ghost drawn behind a bar. */
  baseline?: string;
  /** The dependency-arrow layer (an SVG; color flows from currentColor). */
  dependencies?: string;
  event?: string;
  nav?: string;
  toolbar?: string;
  /** The gantt body (tree + track). */
  view?: string;
}

/** Row context handed to tree-panel column and label renderers. */
interface GanttColumnContext {
  collapsed: boolean;
  depth: number;
  isGroup: boolean;
  resource: GanttResource;
}

/** One extra tree-panel column after the built-in name column. */
interface GanttColumn {
  /** Cell content alignment. Default "start". */
  align?: "start" | "center" | "end";
  /** Extra classes on every cell of this column (header included). */
  className?: string;
  /** Stable id; doubles as the default header label. */
  id: string;
  /** Cell content per row; omit or return null for an empty cell. */
  render?: (ctx: GanttColumnContext) => ReactNode;
  /** Header label. */
  title?: ReactNode;
  /** Fixed column width in px. Default 96. */
  width?: number;
}

/** Pointer-activation thresholds; unset keys keep the dnd-kit parity defaults. */
interface GanttActivationConfig {
  /** Mouse travel (px) before a drag-create starts. Default 4. */
  createDistancePx?: number;
  /** Mouse travel (px) before a bar move starts. Default 5. */
  moveDistancePx?: number;
  /** Touch long-press delay in ms. Default 250. */
  touchDelayMs?: number;
  /** Touch movement tolerance (px) during the long-press. Default 5. */
  touchTolerancePx?: number;
}

/** Layout metrics (rem unless noted); every knob falls back to its default. */
/** A gridline: false to hide it, true for the default solid stroke, or a style. */
type GanttGridLine = boolean | "solid" | "dashed";

interface GanttTimelineLines {
  /** Row separator lines running across the timeline. Default solid. */
  horizontal?: GanttGridLine;
  /** Unit boundary lines running down the timeline. Default solid. */
  vertical?: GanttGridLine;
}

/** Resolved stroke per axis; null means the axis draws nothing. */
interface GanttResolvedLines {
  horizontal: "solid" | "dashed" | null;
  vertical: "solid" | "dashed" | null;
}

/**
 * One place decides what the grid draws, so the header lines, the body lines
 * and the row separators can never disagree.
 */
function resolveTimelineLines(
  value: GanttTimelineLines | "vertical" | "both" | "none" | undefined
): GanttResolvedLines {
  if (value === "none") {
    return { horizontal: null, vertical: null };
  }
  if (value === "vertical") {
    return { horizontal: null, vertical: "solid" };
  }
  if (value === "both" || value === undefined) {
    return { horizontal: "solid", vertical: "solid" };
  }
  const stroke = (line: GanttGridLine | undefined) =>
    line === false
      ? null
      : line === true || line === undefined
        ? "solid"
        : line;
  return {
    horizontal: stroke(value.horizontal),
    vertical: stroke(value.vertical),
  };
}

interface GanttMetrics {
  /** barLabel "auto" flips the title outside below this bar width. Default 7. */
  autoLabelMin?: number;
  /**
   * Drag-drop indicator height, centered in its lane band and published on
   * the ghost as --gantt-ghost-height so consumer styling can read the same
   * number. Default 1.25.
   */
  ghostHeight?: number;
  /** Scroll distance (px) from an edge that grows the range. Default 160. */
  infiniteScrollEdge?: number;
  /** Gap between stacked schedules in one node. Default 0.1875. */
  laneGap?: number;
  /** Height of one schedule bar. Default 1.25. */
  laneHeight?: number;
  /** Minimum row height. Default 2.5. */
  minRowHeight?: number;
  /** Minimum timeline pane width in px. Default 200. */
  minTimelineWidth?: number;
  /**
   * Vertical inset between the row's edges and its block of schedules - the
   * breathing room around the stack, kept separate from laneGap so schedules
   * in one node can sit tight without cramping the row. Default 0.5.
   */
  rowPadding?: number;
  /** Unit width at zoom 1, per scale. Day scale = width per interval unit. */
  unitWidths?: Partial<Record<GanttScale, number>>;
}

/** Live gesture snapshot handed to the drag/resize indicator render props. */
interface GanttDragIndicatorProps<TData = unknown> {
  /** The event's planned (baseline) window, so a custom overlay can keep
   * drawing it mid-gesture; null when the event carries none. */
  baseline: GanttBaseline | null;
  end: Date;
  kind: "move" | "resize-start" | "resize-end";
  occurrence: GanttOccurrence<TData>;
  /** Proposed (snapped) range of the current gesture step. */
  start: Date;
  valid: boolean;
}

/** Slot handed to a custom schedule-hint renderer. */
interface GanttScheduleHintProps {
  end: Date;
  resource: GanttResource;
  start: Date;
}

/** Parent rollup handed to a custom summary renderer. */
interface GanttSummaryProps {
  end: Date;
  progress: number | null;
  resource: GanttResource;
  start: Date;
}

/** Planned window handed to a custom baseline renderer. */
interface GanttBaselineProps<TData = unknown> {
  end: Date;
  event: GanttEvent<TData>;
  /** Planned start and end coincide: a point in the plan, not a window. */
  milestone: boolean;
  start: Date;
  variance: GanttBaselineVariance;
}

/** Planned NODE window handed to a custom row-baseline renderer. */
interface GanttRowBaselineProps {
  end: Date;
  /** Planned start and end coincide: a point in the plan, not a window. */
  milestone: boolean;
  resource: GanttResource;
  start: Date;
  /** Latest actual end across the node's (and, for a group, its subtree's)
   * events against the planned end; null when there is nothing to compare. */
  variance: GanttBaselineVariance | null;
}

/** Left tree-panel sizing and splitter behavior. */
interface GanttTreePanelConfig {
  /** Splitter upper bound in px. Default 640. */
  maxWidth?: number;
  /** Splitter lower bound in px. Default 180. */
  minWidth?: number;
  /** Width of the sticky name column in px. Default 208. */
  nameColumnWidth?: number;
  /** Fires after any user resize (drag release, keyboard, double-click reset). */
  onWidthChange?: (width: number) => void;
  /** Drag/keyboard splitter between the panels. Default true. */
  resizable?: boolean;
  /** Initial panel width in px. Default 288. */
  width?: number;
}

interface GanttRenderEventProps<TData = unknown> {
  isDragging: boolean;
  isSelected: boolean;
  occurrence: GanttOccurrence<TData>;
  segment: GanttSegment<TData>;
}

/**
 * View-layer configuration: display props and render overrides. These live on
 * <Gantt> (and per-view components), never in the headless options.
 */
interface GanttViewConfig<TData = unknown> {
  /**
   * Bar title placement: "inside" (default) renders it in the bar, "outside"
   * beside the bar, "auto" moves it outside only when the bar is too short.
   */
  barLabel: "inside" | "outside" | "auto";
  /**
   * As-built comparison: the planned window of every bar carrying
   * baselineStart/baselineEnd, ghosted behind it on its own lane (equal
   * instants draw a planned milestone diamond), and of every NODE whose
   * GanttResource carries the same pair, drawn as a band behind its lanes.
   * Display only - dragging a bar moves the actual dates and never its
   * baseline. Default true; rows and events without baseline data draw
   * nothing.
   */
  baselineBars: boolean;
  classNames?: GanttClassNames;
  /** Controlled collapsed group ids; pairs with onCollapsedGroupsChange. */
  collapsedGroups?: string[];
  /**
   * Extra tree-panel columns after the built-in name column. The tree panel
   * scrolls horizontally when the columns outgrow it; the name column stays
   * pinned.
   */
  columns?: GanttColumn[];
  /**
   * Consumer slot pinned at the end of the tree-panel header - the intended
   * home for an add/remove-columns dropdown menu.
   */
  columnsMenu?: ReactNode;
  /** Initial collapsed group ids (uncontrolled). */
  defaultCollapsedGroups?: string[];
  /** Initial zoom multiplier (uncontrolled). Default 1. */
  defaultZoom?: number;
  /**
   * Finish-to-start arrows between bars whose events name `dependencies`.
   * Drawn from the predecessor's end into the dependent's start, under the
   * bars; endpoints on hidden rows are skipped. Default true; nothing
   * renders when no visible event names a dependency.
   */
  dependencyLines: boolean;
  /**
   * "Add task" affordance at the foot of the tree that opens the create-task
   * flow (onCreateTask). Shown only when canCreateTask allows it. Default off.
   */
  displayCreateTaskHint: boolean;
  /**
   * Placement hint over empty timeline track: a validated, snapped tile that
   * opens the schedule flow (onSlotClick, else onSelectSlot) at that day.
   * Works on every scale. Default off.
   */
  displayScheduleHint: boolean;
  /**
   * Empty-track presses on schedulable rows start a drag-create gesture that
   * commits through onSelectSlot. Default off: the whole panel drags-to-pan
   * instead, and scheduling flows through the hint tile / onSlotClick.
   */
  dragCreate: boolean;
  /**
   * Replaces the rollup MATH: return 0-100 (or null to hide) for a group
   * from its descendant events. Default: duration-weighted mean progress.
   */
  getSummaryProgress?: (ctx: {
    resource: GanttResource;
    events: GanttEvent<TData>[];
  }) => number | null;
  /**
   * Extend the timeline into the past/future while scrolling near an edge
   * (the anchor period stays the nav title). Default true.
   */
  infiniteScroll: boolean;
  /**
   * Where the viewport opens. `"now"` (default) centres the current instant
   * when the anchor period contains it and falls back to the anchor; `"anchor"`
   * always centres the anchor; a Date centres that instant.
   *
   * Only `"now"` follows the wall clock - which is right for a live board and
   * wrong for a demo or a report, whose opening composition must not depend on
   * the hour it is viewed at. Those pass an explicit instant.
   */
  initialCenter: "now" | "anchor" | Date;
  /**
   * Day-scale unit interval in minutes: axis units and gridlines follow it.
   */
  interval: number;
  /** Layout metric overrides (row/lane/unit geometry, thresholds). */
  metrics?: GanttMetrics;
  /** Nav button size; icon buttons use the icon twin. Default "sm". */
  navButtonSize: "sm" | "default";
  /** Nav button variant; all nav buttons follow it. Default "ghost". */
  navButtonVariant: "ghost" | "outline" | "secondary" | "default";
  /** Red now-line on the axis. */
  nowIndicator: boolean;
  /**
   * Off-day (non-working day) marking on day/week/month scales. true =
   * weekends with a muted background; a config object customizes weekdays,
   * explicit dates, a predicate, and the marker class.
   */
  offDays?: boolean | GanttOffDaysConfig;
  /** Edge chips that scroll to bars outside the visible timeline. Default true. */
  offscreenIndicators: boolean;
  onCollapsedGroupsChange?: (ids: string[]) => void;
  onSelectedRowsChange?: (ids: string[]) => void;
  onZoomChange?: (zoom: number) => void;
  /**
   * Allow drag-create and slot clicks on rows that have children. Default
   * false: parents aggregate their subtree instead of owning bars.
   */
  parentScheduling: boolean;
  /**
   * Replaces the baseline ghost's content, the milestone diamond included
   * (props.milestone forks the two). The positioned, pointer-transparent
   * wrapper stays gantt-owned.
   */
  renderBaseline?: (props: GanttBaselineProps<TData>) => ReactNode;
  /**
   * Replaces the smooth cursor-following MOVE clone. Content is React and
   * re-renders per snap step; the gantt owns the fixed wrapper and writes
   * its position imperatively per pointermove (no per-frame React).
   */
  renderDragPreview?: (props: GanttDragIndicatorProps<TData>) => ReactNode;
  renderEvent?: (props: GanttRenderEventProps<TData>) => ReactNode;
  /**
   * Right-click menu for a bar: return shadcn ContextMenu items (the primitive
   * wraps every bar in a ContextMenu and renders this as its content). Read
   * the occurrence for the subject and drive actions through the gantt api
   * (useGantt) or your own state - fully headless. Omit for no menu.
   */
  renderEventMenu?: (props: GanttRenderEventProps<TData>) => ReactNode;
  /** Rendered in the timeline body when there are no resources. */
  renderNoResources?: () => ReactNode;
  /**
   * Replaces the RESIZE edge line + status chip. Same positioning contract
   * as renderDragPreview: your content, gantt-owned cursor tracking.
   */
  renderResizeIndicator?: (props: GanttDragIndicatorProps<TData>) => ReactNode;
  /**
   * Tree-node label. Receives the resource with its tree position; return
   * any rich content (icons, badges). Default is the plain title.
   */
  renderResourceLabel?: (props: {
    resource: GanttResource;
    depth: number;
    isGroup: boolean;
    collapsed: boolean;
  }) => ReactNode;
  /**
   * Right-click menu for a tree row (same contract as renderEventMenu):
   * return shadcn ContextMenu items and drive actions through your own state.
   */
  renderResourceMenu?: (ctx: GanttColumnContext) => ReactNode;
  /**
   * Replaces the ROW baseline band's content (same wrapper contract as
   * renderBaseline).
   */
  renderRowBaseline?: (props: GanttRowBaselineProps) => ReactNode;
  /**
   * Replaces the schedule-hint tile + bubble. Rendered inside the snapped,
   * validated, pointer-transparent wrapper: set pointer-events-auto on your
   * clickable parts and drive your own create flow from the slot.
   */
  renderScheduleHint?: (props: GanttScheduleHintProps) => ReactNode;
  /** Replaces the parent rollup strip (the positioned wrapper stays gantt-owned). */
  renderSummary?: (props: GanttSummaryProps) => ReactNode;
  /**
   * Vertical placement of a row's content once a node holds several lanes.
   * "start" (default) keeps the tree label on the baseline of the FIRST
   * schedule; "center" centers both against the grown row.
   */
  rowAlign: GanttRowAlign;
  /**
   * Leaf-row selection checkboxes in the tree panel. Default true;
   * uncontrolled unless selectedRows is passed.
   */
  rowCheckboxes: boolean;
  /**
   * How many schedules a tree node may hold. "multiple" (default) stacks
   * concurrent schedules into stable lanes and grows the row; "single" keeps
   * one track per node - the task-gantt shape. Any node can override it with
   * its own `scheduleMode`.
   */
  scheduleMode: GanttScheduleMode;
  /**
   * Scroll implementation for the gantt body: "custom" (default, shadcn
   * ScrollArea) or "native" (browser scrollbars via overflow auto).
   */
  scrollbars: "custom" | "native";
  /** Controlled selected row ids; pairs with onSelectedRowsChange. */
  selectedRows?: string[];
  /** Sticky nav bar (same contract as the event calendar). Default false. */
  stickyNav: boolean;
  /**
   * Rollup strips on parent rows without bars of their own: the envelope of
   * descendant bars with duration-weighted progress. Default true.
   */
  summaryBars: boolean;
  /**
   * Timeline gridlines. The object form controls the two axes independently
   * and gives each its own stroke: `{ vertical: "dashed", horizontal: true }`.
   * An omitted axis stays on and solid. `true` means solid.
   *
   * The three legacy shorthands still work: "none" (bare), "vertical" (unit
   * boundaries only, rows separated by whitespace) and "both" (adds row
   * separators).
   */
  timelineLines: GanttTimelineLines | "vertical" | "both" | "none";
  /** Tree-panel width, splitter bounds, and resizability. */
  treePanel?: GanttTreePanelConfig;
  /**
   * Ctrl/Cmd + wheel over the timeline zooms the time range, anchored on the
   * pointer. Trackpad pinch arrives as the same event (browsers set ctrlKey
   * on it), so this is also the pinch-to-zoom switch. Default on. The gesture
   * is handed back to the browser at the zoom limits, so page zoom still
   * works there.
   */
  wheelZoom: boolean;
  /** Controlled zoom multiplier; pairs with onZoomChange. */
  zoom?: number;
  /** Floating zoom in/out control over the track. Default on. */
  zoomControl: boolean;
  /** Zoom bounds and button step for the floating control. Default 0.5 - 3, step 0.25. */
  zoomRange?: { min?: number; max?: number; step?: number };
}

const DEFAULT_VIEW_CONFIG: GanttViewConfig = {
  barLabel: "inside",
  baselineBars: true,
  dependencyLines: true,
  displayCreateTaskHint: false,
  displayScheduleHint: false,
  dragCreate: false,
  infiniteScroll: true,
  initialCenter: "now",
  interval: 60,
  navButtonSize: "sm",
  navButtonVariant: "ghost",
  nowIndicator: true,
  offscreenIndicators: true,
  parentScheduling: false,
  rowAlign: "start",
  rowCheckboxes: true,
  scheduleMode: "multiple",
  scrollbars: "custom",
  stickyNav: false,
  summaryBars: true,
  timelineLines: "vertical",
  wheelZoom: true,
  zoomControl: true,
};

const GanttViewConfigContext =
  createContext<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GanttViewConfig<any>>(DEFAULT_VIEW_CONFIG);

/** Root-level display props + render overrides, for view components. */
function useGanttViewConfig<TData = unknown>(): GanttViewConfig<TData> {
  return useContext(GanttViewConfigContext);
}

const VIEW_CONFIG_KEYS: Array<keyof GanttViewConfig> = [
  "nowIndicator",
  "interval",
  "scrollbars",
  "displayScheduleHint",
  "initialCenter",
  "displayCreateTaskHint",
  "dragCreate",
  "zoomControl",
  "wheelZoom",
  "navButtonVariant",
  "navButtonSize",
  "offDays",
  "columns",
  "columnsMenu",
  "treePanel",
  "metrics",
  "timelineLines",
  "barLabel",
  "offscreenIndicators",
  "infiniteScroll",
  "zoomRange",
  "stickyNav",
  "rowCheckboxes",
  "selectedRows",
  "onSelectedRowsChange",
  "collapsedGroups",
  "defaultCollapsedGroups",
  "onCollapsedGroupsChange",
  "zoom",
  "defaultZoom",
  "onZoomChange",
  "parentScheduling",
  "summaryBars",
  "baselineBars",
  "dependencyLines",
  "scheduleMode",
  "rowAlign",
  "classNames",
  "renderEvent",
  "renderEventMenu",
  "renderResourceLabel",
  "renderResourceMenu",
  "renderNoResources",
  "renderDragPreview",
  "renderResizeIndicator",
  "renderScheduleHint",
  "renderSummary",
  "renderBaseline",
  "renderRowBaseline",
  "getSummaryProgress",
];

interface GanttProps<TData = unknown>
  extends UseGanttStateOptions<TData>,
    Partial<GanttViewConfig<TData>>,
    Omit<useRender.ComponentProps<"div">, "children" | "defaultValue"> {
  /** Imperative escape hatch usable from outside the tree. */
  apiRef?: RefObject<GanttApi<TData> | null>;
  /** Adopt a hoisted useGanttState instance; option props are then ignored. */
  calendar?: GanttInstance<TData>;
  children?: ReactNode;
}

const OPTION_KEYS: Array<keyof UseGanttStateOptions> = [
  "events",
  "defaultEvents",
  "scale",
  "defaultScale",
  "date",
  "defaultDate",
  "selection",
  "defaultSelection",
  "interactions",
  "defaultInteractions",
  "loading",
  "timeZone",
  "locale",
  "weekStartsOn",
  "slotDuration",
  "snapDuration",
  "i18n",
  "rangeBounds",
  "activation",
  "maxRangeWindow",
  "resources",
  "overlap",
  "enforceCanDrop",
  "getEventPriority",
  "eventOrder",
  "getOccurrences",
  "onEventClick",
  "onEventDoubleClick",
  "onEventUpdate",
  "canDropEvent",
  "onSlotClick",
  "onSelectSlot",
  "canSelectSlot",
  "onCreateTask",
  "canCreateTask",
  "onResourceClick",
  "onResourceDoubleClick",
  "onRangeChange",
  "onScaleChange",
  "onDateChange",
  "onSelectionChange",
  "onInteractionsChange",
  "onEventsChange",
  "onResourceReorder",
  "onResourceReorderReject",
  "canReorderResource",
];

function shallowEqualRecord(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) {
    return false;
  }
  for (const key of aKeys) {
    if (!Object.is(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

function splitOptions<TData>(props: Record<string, unknown>): {
  options: UseGanttStateOptions<TData>;
  viewConfig: GanttViewConfig<TData>;
  rest: Record<string, unknown>;
} {
  const options: Record<string, unknown> = {};
  const viewConfig: Record<string, unknown> = { ...DEFAULT_VIEW_CONFIG };
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if ((OPTION_KEYS as string[]).includes(key)) {
      options[key] = value;
    } else if ((VIEW_CONFIG_KEYS as string[]).includes(key)) {
      if (value !== undefined) {
        viewConfig[key] = value;
      }
    } else {
      rest[key] = value;
    }
  }
  return {
    options: options as UseGanttStateOptions<TData>,
    rest,
    viewConfig: viewConfig as unknown as GanttViewConfig<TData>,
  };
}

/**
 * Root provider + container. Composition contract:
 * <Gantt><GanttNav/><GanttToolbar/><GanttView/></Gantt>
 */
function Gantt<TData = unknown>({
  calendar,
  apiRef,
  className,
  render,
  children,
  ...props
}: GanttProps<TData>) {
  const { options, viewConfig, rest } = splitOptions<TData>(
    props as Record<string, unknown>
  );

  // Stable context identity: splitOptions builds a fresh object per render,
  // and every row subscribes to this context - hand out the previous object
  // unless a config value actually changed.
  const viewConfigRef = useRef(viewConfig);
  if (
    !shallowEqualRecord(
      viewConfigRef.current as unknown as Record<string, unknown>,
      viewConfig as unknown as Record<string, unknown>
    )
  ) {
    viewConfigRef.current = viewConfig;
  }
  const stableViewConfig = viewConfigRef.current;

  if (calendar && Object.keys(options).length > 0) {
    warnOnce(
      "calendar-and-options",
      "both `calendar` and option props were passed; option props are ignored when adopting an instance."
    );
  }

  const own = useGanttState<TData>(calendar ? {} : options);
  const instance = calendar ?? own;

  useEffect(() => {
    if (apiRef) {
      apiRef.current = instance.api;
    }
  }, [apiRef, instance]);

  const defaultProps = {
    children: (
      <>
        {children}
        <div
          aria-live="polite"
          className="sr-only"
          data-slot="gantt-announcer"
        />
      </>
    ),
    // own the foreground (previews and consumer shells may not set body
    // color) and the type scale: every gantt label inherits the root's text
    // size, so one class here (or on the consumer's className) rescales the
    // whole component - e.g. className="text-sm" for a roomier grid
    className: cn(
      "flex min-h-0 min-w-0 flex-col text-foreground text-xs",
      className
    ),
    "data-slot": "gantt",
  };

  return (
    <GanttContext.Provider value={instance}>
      <GanttViewConfigContext.Provider value={stableViewConfig}>
        {useRender({
          defaultTagName: "div",
          props: mergeProps<"div">(defaultProps, rest),
          render,
        })}
      </GanttViewConfigContext.Provider>
    </GanttContext.Provider>
  );
}

export type {
  GanttActivationConfig,
  GanttApi,
  GanttBaselineProps,
  GanttCallbacks,
  GanttClassNames,
  GanttColumn,
  GanttColumnContext,
  GanttDragIndicatorProps,
  GanttGridLine,
  GanttInstance,
  GanttInternals,
  GanttMetrics,
  GanttNodeSchedules,
  GanttProps,
  GanttRenderEventProps,
  GanttResolvedLines,
  GanttRowBaselineProps,
  GanttScheduleHintProps,
  GanttSettings,
  GanttSummaryProps,
  GanttTimelineLines,
  GanttTreePanelConfig,
  GanttViewConfig,
  UseGanttStateOptions,
};
export {
  DEFAULT_ROW_ALIGN,
  DEFAULT_SCHEDULE_MODE,
  DEFAULT_VIEW_CONFIG,
  Gantt,
  GanttContext,
  GanttViewConfigContext,
  resolveScheduleMode,
  resolveTimelineLines,
  useGantt,
  useGanttInteractions,
  useGanttNavigation,
  useGanttNodeSchedules,
  useGanttOccurrences,
  useGanttScale,
  useGanttSelection,
  useGanttSelector,
  useGanttSettings,
  useGanttSettingsVersion,
  useGanttState,
  useGanttViewConfig,
};
