// biome-ignore-all lint/performance/noJsxPropsBind: kanban DnD and select handlers
// biome-ignore-all lint/complexity/noVoid: fire-and-forget move persist
"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { Button } from "@personal-os/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@personal-os/ui/components/empty";
import { Badge } from "@personal-os/ui/components/reui/badge";
import {
  Kanban,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@personal-os/ui/components/reui/kanban";
import { Rating } from "@personal-os/ui/components/reui/rating";
import { Skeleton } from "@personal-os/ui/components/skeleton";
import { cn } from "@personal-os/ui/lib/utils";
import {
  CalendarIcon,
  FlagIcon,
  GripVerticalIcon,
  ListTodoIcon,
} from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import {
  derivePlanningStage,
  eisenhowerRating,
  formatDueLabel,
  PLANNING_COLUMNS,
  type PlanningStageId,
  QUADRANT_BADGE,
  QUADRANT_LABEL,
  type TaskBoardItem,
  type TaskBoardList,
} from "./task-board-types";

interface ColumnModel {
  description: string;
  dotClassName: string;
  id: string;
  title: string;
}

function BoardScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root
      className="relative w-full min-w-0 pb-3"
      data-slot="scroll-area"
    >
      <ScrollAreaPrimitive.Viewport
        className="w-full rounded-lg outline-none transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-slot="scroll-area-viewport"
      >
        <ScrollAreaPrimitive.Content
          className="flex min-w-full"
          data-slot="scroll-area-content"
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        className="flex touch-none select-none p-px transition-colors data-horizontal:h-2.5 data-vertical:h-full data-vertical:w-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:border-l data-vertical:border-l-transparent"
        data-orientation="horizontal"
        data-slot="scroll-area-scrollbar"
        orientation="horizontal"
      >
        <ScrollAreaPrimitive.Thumb
          className="relative flex-1 rounded-full bg-foreground/15"
          data-slot="scroll-area-thumb"
        />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function TaskCard({
  isOverlay,
  onSelect,
  selected,
  task,
  ...props
}: {
  isOverlay?: boolean;
  onSelect?: (id: string) => void;
  selected?: boolean;
  task: TaskBoardItem;
} & Omit<ComponentProps<typeof KanbanItem>, "value" | "children">) {
  const { quadrant } = task;
  const rating = eisenhowerRating(quadrant);
  const card = (
    <Card
      className={cn(
        "gap-0 bg-card p-0 shadow-xs transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm",
        selected && "border-primary ring-1 ring-primary/40",
        isOverlay && "shadow-lg"
      )}
      size="sm"
    >
      <CardHeader className="grid min-h-5 min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2 px-3 pt-3 pb-0">
        <ListTodoIcon
          aria-hidden="true"
          className="size-3.5 text-muted-foreground"
        />
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle
            className="min-w-0 truncate text-sm leading-5"
            title={task.name}
          >
            {task.name}
          </CardTitle>
          {quadrant ? (
            <Badge variant={QUADRANT_BADGE[quadrant] ?? "outline"}>
              {QUADRANT_LABEL[quadrant] ?? quadrant}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-3 pt-3 pb-3">
        {task.desc ? (
          <p className="line-clamp-2 text-muted-foreground text-xs">
            {task.desc}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">Sem descrição</p>
        )}
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon
            aria-hidden="true"
            className="size-3.5 text-muted-foreground"
          />
          <span className={cn(task.overdue && "text-destructive")}>
            {formatDueLabel(task.due)}
          </span>
          {task.overdue ? (
            <Badge size="sm" variant="destructive">
              Atrasada
            </Badge>
          ) : null}
        </div>
        {rating > 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <FlagIcon aria-hidden="true" className="size-3.5" />
            <Rating
              aria-label={`Prioridade Eisenhower ${rating}`}
              rating={rating}
              size="sm"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <KanbanItem onClick={() => onSelect?.(task.id)} value={task.id} {...props}>
      {isOverlay ? (
        card
      ) : (
        <KanbanItemHandle className="block">{card}</KanbanItemHandle>
      )}
    </KanbanItem>
  );
}

function StageColumn({
  column,
  isOverlay,
  onSelect,
  selectedId,
  tasks,
  ...props
}: {
  column: ColumnModel;
  isOverlay?: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  tasks: TaskBoardItem[];
} & Omit<ComponentProps<typeof KanbanColumn>, "value" | "children">) {
  return (
    <KanbanColumn
      className="w-[calc(100vw-4rem)] max-w-[18.5rem] shrink-0 sm:w-[18.5rem]"
      value={column.id}
      {...props}
    >
      <section
        aria-label={`${column.title}: ${column.description}`}
        className={cn(
          "group/column flex flex-col gap-2 rounded-lg p-1",
          isOverlay && "bg-background"
        )}
      >
        <div className="flex min-h-9 items-center gap-2 px-1">
          <span
            aria-hidden="true"
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              column.dotClassName
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3
                className="truncate font-semibold text-sm"
                title={column.title}
              >
                {column.title}
              </h3>
              <Badge className="bg-background" size="sm" variant="outline">
                {tasks.length}
              </Badge>
            </div>
            <p className="truncate text-muted-foreground text-xs">
              {column.description}
            </p>
          </div>
          <Button
            aria-label={`Mover coluna ${column.title}`}
            className="pointer-events-none cursor-grab text-muted-foreground opacity-0 transition-opacity active:cursor-grabbing group-focus-within/column:pointer-events-auto group-focus-within/column:opacity-100 group-hover/column:pointer-events-auto group-hover/column:opacity-100"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <GripVerticalIcon aria-hidden="true" />
          </Button>
        </div>
        <KanbanColumnContent
          className={cn("gap-3 px-1 py-1", tasks.length === 0 && "min-h-40")}
          value={column.id}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              onSelect={onSelect}
              selected={selectedId === task.id}
              task={task}
            />
          ))}
          {tasks.length === 0 ? (
            <p className="px-2 py-6 text-center text-muted-foreground text-xs">
              Nenhuma task nesta etapa
            </p>
          ) : null}
        </KanbanColumnContent>
      </section>
    </KanbanColumn>
  );
}

function groupByList(
  tasks: TaskBoardItem[],
  lists: TaskBoardList[]
): Record<string, TaskBoardItem[]> {
  const byColumn: Record<string, TaskBoardItem[]> = Object.fromEntries(
    lists.map((list) => [list.id, [] as TaskBoardItem[]])
  );
  for (const task of tasks) {
    const { listId } = task;
    if (listId && byColumn[listId]) {
      byColumn[listId].push(task);
    } else if (lists[0]) {
      byColumn[lists[0].id].push(task);
    }
  }
  return byColumn;
}

function groupByPlanning(
  tasks: TaskBoardItem[],
  overrides: Record<string, PlanningStageId>
): Record<string, TaskBoardItem[]> {
  const byColumn: Record<string, TaskBoardItem[]> = Object.fromEntries(
    PLANNING_COLUMNS.map((column) => [column.id, [] as TaskBoardItem[]])
  );
  for (const task of tasks) {
    const stage = derivePlanningStage(task, overrides);
    byColumn[stage].push(task);
  }
  return byColumn;
}

export function TasksKanbanBoard({
  error,
  lists,
  loading,
  onMoveToList,
  onSelect,
  selectedId,
  tasks,
}: {
  error?: Error | null;
  lists?: TaskBoardList[];
  loading?: boolean;
  onMoveToList?: (input: {
    cardId: string;
    idList: string;
  }) => Promise<void> | void;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
  tasks: TaskBoardItem[];
}) {
  const useTrelloLists = (lists?.length ?? 0) > 0;
  const columns: ColumnModel[] = useMemo(() => {
    if (useTrelloLists && lists) {
      return lists.map((list, index) => ({
        description: "Lista do Trello",
        dotClassName:
          PLANNING_COLUMNS[index % PLANNING_COLUMNS.length]?.dotClassName ??
          "bg-muted-foreground/45",
        id: list.id,
        title: list.name,
      }));
    }
    return PLANNING_COLUMNS;
  }, [lists, useTrelloLists]);

  const columnById = useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns]
  );

  const [overrides, setOverrides] = useState<Record<string, PlanningStageId>>(
    {}
  );
  const [itemsByColumn, setItemsByColumn] = useState<
    Record<string, TaskBoardItem[]>
  >(() =>
    useTrelloLists && lists
      ? groupByList(tasks, lists)
      : groupByPlanning(tasks, {})
  );

  useEffect(() => {
    setItemsByColumn(
      useTrelloLists && lists
        ? groupByList(tasks, lists)
        : groupByPlanning(tasks, overrides)
    );
  }, [lists, overrides, tasks, useTrelloLists]);

  const taskCount = Object.values(itemsByColumn).reduce(
    (count, columnTasks) => count + columnTasks.length,
    0
  );

  const applyPlanningOverrides = (next: Record<string, TaskBoardItem[]>) => {
    const nextOverrides = { ...overrides };
    for (const [columnId, columnTasks] of Object.entries(next)) {
      if (!PLANNING_COLUMNS.some((column) => column.id === columnId)) {
        continue;
      }
      for (const task of columnTasks) {
        nextOverrides[task.id] = columnId as PlanningStageId;
      }
    }
    setOverrides(nextOverrides);
  };

  const persistTrelloMoves = (
    previous: Record<string, TaskBoardItem[]>,
    next: Record<string, TaskBoardItem[]>
  ) => {
    if (!onMoveToList) {
      return;
    }
    for (const [columnId, columnTasks] of Object.entries(next)) {
      for (const task of columnTasks) {
        const wasHere = previous[columnId]?.some((item) => item.id === task.id);
        if (wasHere || !task.listId || task.listId === columnId) {
          continue;
        }
        void Promise.resolve(
          onMoveToList({ cardId: task.id, idList: columnId })
        ).catch((moveError: unknown) => {
          setItemsByColumn(previous);
          toast.error(
            moveError instanceof Error
              ? moveError.message
              : "Não foi possível mover o card no Trello"
          );
        });
      }
    }
  };

  const handleValueChange = (next: Record<string, TaskBoardItem[]>) => {
    const previous = itemsByColumn;
    setItemsByColumn(next);
    if (useTrelloLists && onMoveToList) {
      persistTrelloMoves(previous, next);
      return;
    }
    applyPlanningOverrides(next);
  };

  const getItemValue = (item: TaskBoardItem) => item.id;

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden p-1">
        {["a", "b", "c", "d"].map((slot) => (
          <Skeleton className="h-72 w-72 shrink-0 rounded-lg" key={slot} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Não foi possível carregar o quadro</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (taskCount === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Nenhuma task aberta</EmptyTitle>
          <EmptyDescription>
            Conecte o Trello em Integrações ou peça ao operador para criar
            cards.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section className="flex w-full flex-col gap-4">
      <header className="flex flex-col gap-1 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-base">Quadro de tasks</h2>
          <Badge className="bg-background" variant="outline">
            {taskCount}
          </Badge>
          <Badge variant="secondary">
            {useTrelloLists ? "Listas Trello" : "Etapas de planejamento"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {useTrelloLists
            ? "Arraste cards entre listas do Trello. A mudança é persistida."
            : "Arraste entre Entrada, Hoje, Agendadas, Em progresso e Completas (otimista local)."}
        </p>
      </header>

      <Kanban
        className="w-full"
        getItemValue={getItemValue}
        onValueChange={handleValueChange}
        value={itemsByColumn}
      >
        <BoardScrollArea>
          <SortableContext
            items={Object.keys(itemsByColumn)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              className="flex min-w-full items-start gap-3 p-1"
              data-slot="kanban-board"
            >
              {Object.entries(itemsByColumn).map(([columnId, columnTasks]) => {
                const column = columnById.get(columnId);
                if (!column) {
                  return null;
                }
                return (
                  <StageColumn
                    column={column}
                    key={columnId}
                    onSelect={onSelect}
                    selectedId={selectedId}
                    tasks={columnTasks}
                  />
                );
              })}
            </div>
          </SortableContext>
        </BoardScrollArea>

        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") {
              const column = columnById.get(String(value));
              if (!column) {
                return null;
              }
              return (
                <StageColumn
                  column={column}
                  isOverlay
                  tasks={itemsByColumn[String(value)] ?? []}
                />
              );
            }
            const task = Object.values(itemsByColumn)
              .flat()
              .find((item) => item.id === value);
            return task ? <TaskCard isOverlay task={task} /> : null;
          }}
        </KanbanOverlay>
      </Kanban>
    </section>
  );
}
