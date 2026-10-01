// @ts-nocheck
"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type {
  CollisionDetection,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DropAnimation,
  Modifiers,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  DragOverlay,
  defaultDropAnimationSideEffects,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  type AnimateLayoutChanges,
  arrayMove,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "cn";
import type * as React from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

interface KanbanContextProps<T> {
  activeId: UniqueIdentifier | null;
  columnIds: string[];
  columns: Record<string, T[]>;
  findContainer: (id: UniqueIdentifier) => string | undefined;
  getItemId: (item: T) => string;
  isColumn: (id: UniqueIdentifier) => boolean;
  modifiers?: Modifiers;
  setActiveId: (id: UniqueIdentifier | null) => void;
  setColumns: (columns: Record<string, T[]>) => void;
}

const KanbanContext = createContext<KanbanContextProps<any>>({
  activeId: null,
  columnIds: [],
  columns: {},
  findContainer: () => undefined,
  getItemId: () => "",
  isColumn: () => false,
  modifiers: undefined,
  setActiveId: () => {},
  setColumns: () => {},
});

const ColumnContext = createContext<{
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}>({
  attributes: {} as DraggableAttributes,
  disabled: false,
  isDragging: false,
  listeners: undefined,
});

const ItemContext = createContext<{
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}>({
  disabled: false,
  isDragging: false,
  listeners: undefined,
});

const IsOverlayContext = createContext(false);

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.4",
      },
    },
  }),
};

/**
 * Client-mount gate for the `createPortal` call in KanbanOverlay, which needs
 * `document.body` and so must not run on the server or during hydration.
 *
 * A never-notifying subscription makes `useSyncExternalStore` return the server
 * snapshot (`false`) while rendering on the server and while hydrating, then the
 * client snapshot (`true`) once mounted - the same gate the previous
 * `useLayoutEffect(() => setMounted(true), [])` provided, minus the extra render
 * pass that `react-hooks/set-state-in-effect` flags. All three functions are
 * module-scoped so their identities stay stable; an inline `getSnapshot` is the
 * classic cause of an infinite re-subscribe loop.
 */
const subscribeToNothing = () => () => {};
const getIsMounted = () => true;
const getIsMountedOnServer = () => false;

const MOUSE_SENSOR_OPTIONS = { activationConstraint: { distance: 10 } };
const TOUCH_SENSOR_OPTIONS = {
  activationConstraint: { delay: 250, tolerance: 5 },
};
const KEYBOARD_SENSOR_OPTIONS = {
  coordinateGetter: sortableKeyboardCoordinates,
};
const MEASURING_CONFIG = {
  droppable: { strategy: MeasuringStrategy.Always },
};

export interface KanbanMoveEvent {
  activeContainer: string;
  activeIndex: number;
  event: DragEndEvent;
  overContainer: string;
  overIndex: number;
}

export interface KanbanCommitMeta<T> {
  activeContainer: string;
  activeIndex: number;
  event: DragEndEvent;
  kind: "item" | "column";
  overContainer: string;
  overIndex: number;
  previousValue: Record<string, T[]>;
}

export interface KanbanRootProps<T>
  extends Omit<
    useRender.ComponentProps<"div">,
    "children" | "onDragStart" | "onDragEnd"
  > {
  accessibility?: React.ComponentProps<typeof DndContext>["accessibility"];
  children: ReactNode;
  getItemValue: (item: T) => string;
  modifiers?: Modifiers;
  onDragCancel?: (event: DragCancelEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onMove?: (event: KanbanMoveEvent) => void;
  onValueChange: (value: Record<string, T[]>) => void;
  onValueCommit?: (
    value: Record<string, T[]>,
    meta: KanbanCommitMeta<T>
  ) => void;
  restoreOnCancel?: boolean;
  value: Record<string, T[]>;
}

function Kanban<T>({
  value,
  onValueChange,
  getItemValue,
  children,
  className,
  render,
  onMove,
  onValueCommit,
  restoreOnCancel = false,
  onDragStart,
  onDragEnd,
  onDragCancel,
  accessibility,
  modifiers,
  ...props
}: KanbanRootProps<T>) {
  const columns = value;
  const setColumns = onValueChange;
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Always-current mirrors so the drag handlers can read fresh values without
  // widening their dependency arrays (keeps handler identity stable). The
  // handlers only fire after commit, so syncing the mirrors in an effect is
  // safe — assigning to a ref during render breaks under concurrent rendering.
  const valueRef = useRef(value);
  const getItemValueRef = useRef(getItemValue);
  useLayoutEffect(() => {
    valueRef.current = value;
    getItemValueRef.current = getItemValue;
  });
  const dragOriginRef = useRef<{
    value: Record<string, T[]>;
    container: string | undefined;
    index: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, MOUSE_SENSOR_OPTIONS),
    useSensor(TouchSensor, TOUCH_SENSOR_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS)
  );

  const columnIds = useMemo(() => {
    const keys = Object.keys(columns);
    if (process.env.NODE_ENV !== "production") {
      const seen = new Set<string>();
      for (const key of keys) {
        for (const item of columns[key]) {
          const itemId = getItemValue(item);
          if (seen.has(itemId)) {
            console.warn(
              `[Kanban] Duplicate item id "${itemId}". Item ids must be unique across all columns, or drag and drop will misbehave.`
            );
            break;
          }
          seen.add(itemId);
        }
      }
    }
    return keys;
  }, [columns, getItemValue]);

  const isColumn = useCallback(
    (id: UniqueIdentifier) => columnIds.includes(id as string),
    [columnIds]
  );

  const findContainer = useCallback(
    (id: UniqueIdentifier) => {
      if (isColumn(id)) {
        return id as string;
      }
      return columnIds.find((key) =>
        columns[key].some((item) => getItemValue(item) === id)
      );
    },
    [columns, columnIds, getItemValue, isColumn]
  );

  // The droppable under the pointer, not the one the dragged rect overlaps
  // most: in the gap between columns that overlap flips with every live-preview
  // move, and each flip re-runs dragOver until React bails out.
  const lastOverIdRef = useRef<UniqueIdentifier | null>(null);
  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      if (isColumn(args.active.id)) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((container) =>
            isColumn(container.id)
          ),
        });
      }

      // Keyboard drags carry no pointer.
      if (!args.pointerCoordinates) {
        return rectIntersection(args);
      }

      let overId = getFirstCollision(pointerWithin(args), "id");
      if (overId != null) {
        // Over a column's empty space: resolve to its closest item, if any.
        if (isColumn(overId)) {
          const itemIds = new Set(columns[overId as string].map(getItemValue));
          overId =
            closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) => itemIds.has(container.id as string)
              ),
            })[0]?.id ?? overId;
        }
        lastOverIdRef.current = overId;
        return [{ id: overId }];
      }

      // Between droppables: hold the last target so the preview stays put.
      return lastOverIdRef.current == null
        ? rectIntersection(args)
        : [{ id: lastOverIdRef.current }];
    },
    [columns, getItemValue, isColumn]
  );

  const commitChange = useCallback(
    (
      finalValue: Record<string, T[]>,
      event: DragEndEvent,
      kind: "item" | "column"
    ) => {
      if (!onValueCommit) {
        return;
      }
      const origin = dragOriginRef.current;
      if (!origin) {
        return;
      }

      const id = event.active.id;

      if (kind === "column") {
        const keys = Object.keys(finalValue);
        const overIndex = keys.indexOf(id as string);
        if (overIndex === -1 || overIndex === origin.index) {
          return;
        }
        onValueCommit(finalValue, {
          activeContainer: id as string,
          activeIndex: origin.index,
          event,
          kind: "column",
          overContainer: String(event.over?.id ?? id),
          overIndex,
          previousValue: origin.value,
        });
        return;
      }

      const getId = getItemValueRef.current;
      let overContainer: string | undefined;
      let overIndex = -1;
      for (const key of Object.keys(finalValue)) {
        const found = finalValue[key].findIndex((item) => getId(item) === id);
        if (found !== -1) {
          overContainer = key;
          overIndex = found;
          break;
        }
      }
      if (overContainer === undefined) {
        return;
      }
      if (overContainer === origin.container && overIndex === origin.index) {
        return;
      }
      onValueCommit(finalValue, {
        activeContainer: origin.container ?? overContainer,
        activeIndex: origin.index,
        event,
        kind: "item",
        overContainer,
        overIndex,
        previousValue: origin.value,
      });
    },
    [onValueCommit]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      lastOverIdRef.current = null;
      setActiveId(event.active.id);
      onDragStart?.(event);

      if (onValueCommit || restoreOnCancel) {
        const snapshot = valueRef.current;
        const id = event.active.id;
        const keys = Object.keys(snapshot);
        if (keys.includes(id as string)) {
          dragOriginRef.current = {
            container: id as string,
            index: keys.indexOf(id as string),
            value: snapshot,
          };
        } else {
          const getId = getItemValueRef.current;
          let container: string | undefined;
          let index = -1;
          for (const key of keys) {
            const found = snapshot[key].findIndex((item) => getId(item) === id);
            if (found !== -1) {
              container = key;
              index = found;
              break;
            }
          }
          dragOriginRef.current = { container, index, value: snapshot };
        }
      }
    },
    [onDragStart, onValueCommit, restoreOnCancel]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (onMove) {
        return;
      }

      const { active, over } = event;
      if (!over) {
        return;
      }

      if (isColumn(active.id)) {
        return;
      }

      const activeContainer = findContainer(active.id);
      const overContainer = findContainer(over.id);

      if (!(activeContainer && overContainer)) {
        return;
      }

      if (activeContainer === overContainer) {
        const container = activeContainer;
        const activeIndex = columns[container].findIndex(
          (item: T) => getItemValue(item) === active.id
        );
        const overIndex = columns[container].findIndex(
          (item: T) => getItemValue(item) === over.id
        );

        if (activeIndex !== overIndex) {
          setColumns({
            ...columns,
            [container]: arrayMove(columns[container], activeIndex, overIndex),
          });
        }
      } else {
        const activeItems = columns[activeContainer];
        const overItems = columns[overContainer];

        const activeIndex = activeItems.findIndex(
          (item: T) => getItemValue(item) === active.id
        );
        let overIndex = overItems.findIndex(
          (item: T) => getItemValue(item) === over.id
        );

        // If dropping on the column itself, not an item
        if (isColumn(over.id)) {
          overIndex = overItems.length;
        }

        const newActiveItems = [...activeItems];
        const newOverItems = [...overItems];
        const [movedItem] = newActiveItems.splice(activeIndex, 1);
        newOverItems.splice(overIndex, 0, movedItem);

        setColumns({
          ...columns,
          [activeContainer]: newActiveItems,
          [overContainer]: newOverItems,
        });
      }
    },
    [findContainer, getItemValue, isColumn, setColumns, columns, onMove]
  );

  const handleDragCancel = useCallback(
    (event: DragCancelEvent) => {
      const origin = dragOriginRef.current;

      if (restoreOnCancel && origin && !onMove) {
        // Escape/cancel: undo the live-preview reshuffle applied during dragOver.
        setColumns(origin.value);
      } else if (onValueCommit && origin && !onMove) {
        // No restore requested: the live preview stays visible, so commit it.
        commitChange(valueRef.current, event, "item");
      }

      dragOriginRef.current = null;
      lastOverIdRef.current = null;
      setActiveId(null);
      onDragCancel?.(event);
    },
    [
      restoreOnCancel,
      onMove,
      onValueCommit,
      setColumns,
      onDragCancel,
      commitChange,
    ]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      lastOverIdRef.current = null;
      setActiveId(null);
      onDragEnd?.(event);

      if (!over) {
        // Released over nothing. In default mode the live preview during
        // dragOver may have already moved the item, so commit the current value.
        commitChange(valueRef.current, event, "item");
        dragOriginRef.current = null;
        return;
      }

      // Handle item move callback
      if (onMove && !isColumn(active.id)) {
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over.id);

        if (activeContainer && overContainer) {
          const activeIndex = columns[activeContainer].findIndex(
            (item: T) => getItemValue(item) === active.id
          );
          const overIndex = isColumn(over.id)
            ? columns[overContainer].length
            : columns[overContainer].findIndex(
                (item: T) => getItemValue(item) === over.id
              );

          onMove({
            activeContainer,
            activeIndex,
            event,
            overContainer,
            overIndex,
          });
        }
        // In onMove mode the consumer owns applying the item move, so do not
        // fire onValueCommit for item moves; column reorders still commit below.
        dragOriginRef.current = null;
        return;
      }

      // Handle column reordering
      if (isColumn(active.id) && isColumn(over.id)) {
        const activeIndex = columnIds.indexOf(active.id as string);
        const overIndex = columnIds.indexOf(over.id as string);
        if (activeIndex !== overIndex) {
          const newOrder = arrayMove(
            Object.keys(columns),
            activeIndex,
            overIndex
          );
          const newColumns: Record<string, T[]> = {};
          newOrder.forEach((key) => {
            newColumns[key] = columns[key];
          });
          setColumns(newColumns);
          commitChange(newColumns, event, "column");
        }
        dragOriginRef.current = null;
        return;
      }

      // A column drag that ends over a non-column droppable is not an item move.
      if (isColumn(active.id)) {
        dragOriginRef.current = null;
        return;
      }

      const activeContainer = findContainer(active.id);
      const overContainer = findContainer(over.id);

      // Handle item reordering within the same column
      if (
        activeContainer &&
        overContainer &&
        activeContainer === overContainer
      ) {
        const container = activeContainer;
        const activeIndex = columns[container].findIndex(
          (item: T) => getItemValue(item) === active.id
        );
        const overIndex = columns[container].findIndex(
          (item: T) => getItemValue(item) === over.id
        );

        if (activeIndex === overIndex) {
          // Cross-column moves are applied during dragOver, so the current
          // value is already final.
          commitChange(columns, event, "item");
        } else {
          const newColumns = {
            ...columns,
            [container]: arrayMove(columns[container], activeIndex, overIndex),
          };
          setColumns(newColumns);
          commitChange(newColumns, event, "item");
        }
      } else {
        commitChange(columns, event, "item");
      }
      dragOriginRef.current = null;
    },
    [
      columnIds,
      columns,
      findContainer,
      getItemValue,
      isColumn,
      setColumns,
      onMove,
      onDragEnd,
      commitChange,
    ]
  );

  const contextValue = useMemo(
    () => ({
      activeId,
      columnIds,
      columns,
      findContainer,
      getItemId: getItemValue,
      isColumn,
      modifiers,
      setActiveId,
      setColumns,
    }),
    [
      columns,
      setColumns,
      getItemValue,
      columnIds,
      activeId,
      findContainer,
      isColumn,
      modifiers,
    ]
  );

  const defaultProps = {
    children,
    className: cn(activeId !== null && "cursor-grabbing!", className),
    "data-dragging": activeId !== null,
    "data-slot": "kanban",
  };

  return (
    <KanbanContext.Provider value={contextValue}>
      <DndContext
        accessibility={accessibility}
        collisionDetection={collisionDetection}
        measuring={MEASURING_CONFIG}
        modifiers={modifiers}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        {useRender({
          defaultTagName: "div",
          props: mergeProps<"div">(defaultProps, props),
          render,
        })}
      </DndContext>
    </KanbanContext.Provider>
  );
}

export type KanbanBoardProps = useRender.ComponentProps<"div">;

function KanbanBoard({ className, render, ...props }: KanbanBoardProps) {
  const { columnIds } = useContext(KanbanContext);

  const defaultProps = {
    children: props.children,
    className: cn("grid auto-rows-fr gap-4 sm:grid-cols-3", className),
    "data-slot": "kanban-board",
  };

  return (
    <SortableContext items={columnIds} strategy={rectSortingStrategy}>
      {useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
      })}
    </SortableContext>
  );
}

export interface KanbanColumnProps extends useRender.ComponentProps<"div"> {
  disabled?: boolean;
  value: string;
}

function KanbanColumn({
  value,
  className,
  render,
  disabled,
  ...props
}: KanbanColumnProps) {
  const isOverlay = useContext(IsOverlayContext);

  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    animateLayoutChanges,
    disabled: disabled || isOverlay,
    id: value,
  });

  // Hooks must run unconditionally; the derived value below is used only in the non-overlay branch.
  const { activeId, isColumn } = useContext(KanbanContext);
  const isColumnDragging = activeId ? isColumn(activeId) : false;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as CSSProperties;

  const defaultProps = isOverlay
    ? {
        children: props.children,
        className: cn("group/kanban-column flex flex-col", className),
        "data-dragging": true,
        "data-slot": "kanban-column",
        "data-value": value,
      }
    : {
        children: props.children,
        className: cn(
          "group/kanban-column flex flex-col",
          isSortableDragging && "z-50 opacity-50",
          disabled && "opacity-50",
          className
        ),
        "data-disabled": disabled,
        "data-dragging": isSortableDragging,
        "data-slot": "kanban-column",
        "data-value": value,
        ref: setNodeRef,
        style,
      };

  return (
    <ColumnContext.Provider
      value={
        isOverlay
          ? {
              attributes: {} as DraggableAttributes,
              disabled: false,
              isDragging: true,
              listeners: undefined,
            }
          : { attributes, disabled, isDragging: isColumnDragging, listeners }
      }
    >
      {useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
      })}
    </ColumnContext.Provider>
  );
}

export interface KanbanColumnHandleProps
  extends useRender.ComponentProps<"div"> {
  cursor?: boolean;
}

function KanbanColumnHandle({
  className,
  render,
  cursor = true,
  ...props
}: KanbanColumnHandleProps) {
  const { attributes, listeners, isDragging, disabled } =
    useContext(ColumnContext);

  const defaultProps = {
    "data-disabled": disabled,
    "data-dragging": isDragging,
    "data-slot": "kanban-column-handle",
    ...attributes,
    ...listeners,
    children: props.children,
    className: cn(
      "opacity-0 transition-opacity group-hover/kanban-column:opacity-100",
      cursor && (isDragging ? "cursor-grabbing!" : "cursor-grab!"),
      className
    ),
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

export interface KanbanItemProps extends useRender.ComponentProps<"div"> {
  disabled?: boolean;
  value: string;
}

function KanbanItem({
  value,
  className,
  render,
  disabled,
  ...props
}: KanbanItemProps) {
  const isOverlay = useContext(IsOverlayContext);

  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    animateLayoutChanges,
    disabled: disabled || isOverlay,
    id: value,
  });

  // Hooks must run unconditionally; the derived value below is used only in the non-overlay branch.
  const { activeId, isColumn } = useContext(KanbanContext);
  const isItemDragging = activeId ? !isColumn(activeId) : false;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as CSSProperties;

  const defaultProps = isOverlay
    ? {
        children: props.children,
        className: cn(className),
        "data-dragging": true,
        "data-slot": "kanban-item",
        "data-value": value,
      }
    : {
        "data-disabled": disabled,
        "data-dragging": isSortableDragging,
        "data-slot": "kanban-item",
        "data-value": value,
        ref: setNodeRef,
        style,
        ...attributes,
        children: props.children,
        className: cn(
          isSortableDragging && "z-50 opacity-50",
          disabled && "opacity-50",
          className
        ),
      };

  return (
    <ItemContext.Provider
      value={
        isOverlay
          ? { disabled: false, isDragging: true, listeners: undefined }
          : { disabled, isDragging: isItemDragging, listeners }
      }
    >
      {useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
      })}
    </ItemContext.Provider>
  );
}

export interface KanbanItemHandleProps extends useRender.ComponentProps<"div"> {
  cursor?: boolean;
}

function KanbanItemHandle({
  className,
  render,
  cursor = true,
  ...props
}: KanbanItemHandleProps) {
  const { listeners, isDragging, disabled } = useContext(ItemContext);

  const defaultProps = {
    "data-disabled": disabled,
    "data-dragging": isDragging,
    "data-slot": "kanban-item-handle",
    ...listeners,
    children: props.children,
    className: cn(
      cursor && (isDragging ? "cursor-grabbing!" : "cursor-grab!"),
      className
    ),
  };

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(defaultProps, props),
    render,
  });
}

export interface KanbanColumnContentProps
  extends useRender.ComponentProps<"div"> {
  value: string;
}

function KanbanColumnContent({
  value,
  className,
  render,
  ...props
}: KanbanColumnContentProps) {
  const { columns, getItemId } = useContext(KanbanContext);

  const itemIds = useMemo(() => {
    const items = columns[value];
    if (!items) {
      throw new Error(
        `KanbanColumnContent: column "${value}" was not found in the Kanban value. ` +
          `Available columns: ${Object.keys(columns).join(", ") || "(none)"}.`
      );
    }
    return items.map(getItemId);
  }, [columns, getItemId, value]);

  const defaultProps = {
    children: props.children,
    className: cn("flex flex-col gap-2", className),
    "data-slot": "kanban-column-content",
  };

  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      {useRender({
        defaultTagName: "div",
        props: mergeProps<"div">(defaultProps, props),
        render,
      })}
    </SortableContext>
  );
}

export interface KanbanOverlayProps
  extends Omit<React.ComponentProps<typeof DragOverlay>, "children"> {
  children?:
    | ReactNode
    | ((params: {
        value: UniqueIdentifier;
        variant: "column" | "item";
      }) => ReactNode);
}

function KanbanOverlay({ children, className, ...props }: KanbanOverlayProps) {
  const { activeId, isColumn, modifiers } = useContext(KanbanContext);
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    getIsMounted,
    getIsMountedOnServer
  );

  const variant = activeId ? (isColumn(activeId) ? "column" : "item") : "item";

  const content =
    activeId && children
      ? typeof children === "function"
        ? children({ value: activeId, variant })
        : children
      : null;

  if (!mounted) {
    return null;
  }

  return createPortal(
    <DragOverlay
      className={cn("z-50", activeId && "cursor-grabbing", className)}
      dropAnimation={dropAnimationConfig}
      modifiers={modifiers}
      {...props}
    >
      <IsOverlayContext.Provider value={true}>
        {content}
      </IsOverlayContext.Provider>
    </DragOverlay>,
    document.body
  );
}

export {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
};
