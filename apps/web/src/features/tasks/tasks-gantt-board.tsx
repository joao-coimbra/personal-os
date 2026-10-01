"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@personal-os/ui/components/empty";
import { Badge } from "@personal-os/ui/components/reui/badge";
import { Gantt } from "@personal-os/ui/components/reui/gantt/gantt";
import {
  GanttNav,
  GanttNavNext,
  GanttNavPrev,
  GanttNavToday,
  GanttTitle,
} from "@personal-os/ui/components/reui/gantt/gantt-nav";
import type {
  GanttEvent,
  GanttResource,
} from "@personal-os/ui/components/reui/gantt/gantt-types";
import { GanttView } from "@personal-os/ui/components/reui/gantt/gantt-view";
import { Skeleton } from "@personal-os/ui/components/skeleton";
import { addDays, addHours, startOfDay, subDays } from "date-fns";
import { ListTodoIcon } from "lucide-react";
import { useMemo } from "react";

import type { TaskBoardItem, TaskBoardList } from "./task-board-types";

const QUADRANT_COLOR: Record<string, string> = {
  delegate: "var(--color-sky-500)",
  do: "var(--color-rose-500)",
  eliminate: "var(--color-muted-foreground)",
  schedule: "var(--color-amber-500)",
};

const LIST_PROGRESS: Record<string, number> = {
  agendadas: 15,
  concluidas: 100,
  concluídas: 100,
  done: 100,
  "em progresso": 55,
  entrada: 5,
  hoje: 35,
  inbox: 5,
  progress: 55,
  scheduled: 15,
  today: 35,
};

function listProgress(listName: string | undefined): number {
  if (!listName) {
    return 20;
  }
  return LIST_PROGRESS[listName.toLowerCase()] ?? 25;
}

function taskWindow(
  task: TaskBoardItem,
  now: Date
): { end: Date; start: Date } | null {
  if (!task.due) {
    // Undated cards still appear as a short bar today so the Gantt is not empty.
    const start = addHours(startOfDay(now), 9);
    return { end: addHours(start, 2), start };
  }
  const due = new Date(task.due);
  let durationHours = 2;
  if (task.quadrant === "schedule") {
    durationHours = 3;
  }
  let start = addHours(due, -durationHours);
  if (start.getTime() >= due.getTime()) {
    start = addHours(due, -1);
  }
  return { end: due, start };
}

function buildResources(lists: TaskBoardList[]): GanttResource[] {
  if (lists.length === 0) {
    return [{ id: "inbox", title: "Entrada" }];
  }
  return lists.map((list) => ({
    id: list.id,
    scheduleMode: "multiple" as const,
    title: list.name,
  }));
}

function buildEvents(
  tasks: TaskBoardItem[],
  lists: TaskBoardList[],
  now: Date
): GanttEvent<{ listName?: string; overdue: boolean; quadrant?: string }>[] {
  const listNameById = new Map(lists.map((list) => [list.id, list.name]));
  const fallbackListId = lists[0]?.id ?? "inbox";
  const events: GanttEvent<{
    listName?: string;
    overdue: boolean;
    quadrant?: string;
  }>[] = [];

  for (const task of tasks) {
    const window = taskWindow(task, now);
    if (!window) {
      continue;
    }
    const resourceId = task.listId ?? fallbackListId;
    const listName = listNameById.get(resourceId);
    events.push({
      color: QUADRANT_COLOR[task.quadrant ?? ""] ?? "var(--color-primary)",
      data: {
        listName,
        overdue: task.overdue,
        quadrant: task.quadrant,
      },
      end: window.end,
      id: task.id,
      progress: listProgress(listName),
      readOnly: true,
      resourceId,
      start: window.start,
      title: task.name,
    });
  }
  return events;
}

/**
 * Gantt driven by live Trello tasks/lists (due dates + list stages).
 * Replaces the hard-coded POS-01 playbook demo when real data exists.
 */
export function TasksGanttBoard({
  error,
  lists = [],
  loading,
  tasks,
}: {
  error?: Error | null;
  lists?: TaskBoardList[];
  loading?: boolean;
  tasks: TaskBoardItem[];
}) {
  const now = useMemo(() => new Date(), []);
  const resources = useMemo(() => buildResources(lists), [lists]);
  const events = useMemo(
    () => buildEvents(tasks, lists, now),
    [lists, now, tasks]
  );
  const rangeBounds = useMemo(
    () => ({
      max: addDays(startOfDay(now), 14),
      min: subDays(startOfDay(now), 3),
    }),
    [now]
  );

  if (loading) {
    return (
      <section className="flex w-full flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[28rem] w-full rounded-lg" />
      </section>
    );
  }

  if (error) {
    return (
      <Empty className="min-h-[20rem] border">
        <EmptyHeader>
          <EmptyTitle>Não foi possível carregar o Gantt</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (tasks.length === 0) {
    return (
      <Empty className="min-h-[20rem] border">
        <EmptyHeader>
          <ListTodoIcon aria-hidden="true" className="size-8 opacity-50" />
          <EmptyTitle>Sem tasks para o Gantt</EmptyTitle>
          <EmptyDescription>
            Conecte o Trello e rode `bun run seed` para popular cards com prazos
            — o Gantt usa as mesmas listas do Kanban.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section className="flex w-full flex-col gap-4">
      <header className="flex flex-col gap-1 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-base">Cronograma das tasks</h2>
          <Badge variant="secondary">Trello ao vivo</Badge>
          <Badge className="bg-background" variant="outline">
            {events.length} barras
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Barras a partir dos vencimentos e listas do Trello (mesma fonte do
          Kanban). Sem o playbook demo POS-01.
        </p>
      </header>
      <div className="min-h-[28rem] overflow-hidden rounded-lg border bg-background">
        <Gantt
          className="min-h-[28rem]"
          defaultDate={now}
          defaultScale="day"
          events={events}
          infiniteScroll={false}
          initialCenter={now}
          rangeBounds={rangeBounds}
          resources={resources}
          rowCheckboxes={false}
          scheduleMode="multiple"
        >
          <GanttNav className="border-b px-3">
            <GanttNavToday />
            <GanttNavPrev />
            <GanttNavNext />
            <GanttTitle />
          </GanttNav>
          <GanttView />
        </Gantt>
      </div>
    </section>
  );
}
