import { Badge } from "@personal-os/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { TasksBoards } from "@/features/tasks/tasks-boards";
import { orpc } from "@/utils/orpc";

const TASK_FILTERS = ["today", "scheduled", "completed"] as const;

type TaskFilter = (typeof TASK_FILTERS)[number];

interface TaskRow {
  due: string | null;
  id: string;
  name: string;
  overdue: boolean;
  quadrant?: string | null;
}

function parseTaskFilter(value: unknown): TaskFilter | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return TASK_FILTERS.includes(value as TaskFilter)
    ? (value as TaskFilter)
    : undefined;
}

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
  validateSearch: (
    search: Record<string, unknown>
  ): { filter?: TaskFilter } => ({
    filter: parseTaskFilter(search.filter),
  }),
});

const FILTER_TITLE: Record<TaskFilter, string> = {
  completed: "Completas",
  scheduled: "Agendadas",
  today: "Hoje",
};

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function filterTasks(
  list: TaskRow[],
  filter: TaskFilter | undefined
): TaskRow[] {
  if (!filter) {
    return list;
  }
  if (filter === "completed") {
    // listTasks only returns open cards today.
    return [];
  }

  const now = new Date();
  return list.filter((t) => {
    if (!t.due) {
      return false;
    }
    const due = new Date(t.due);
    if (filter === "today") {
      return isSameLocalDay(due, now);
    }
    return due.getTime() > now.getTime() && !isSameLocalDay(due, now);
  });
}

function TasksPage() {
  const { filter } = Route.useSearch();
  const tasks = useQuery(orpc.tasks.list.queryOptions({ input: {} }));

  const filteredTasks = useMemo(
    () => filterTasks(tasks.data ?? [], filter),
    [filter, tasks.data]
  );

  const title = filter ? FILTER_TITLE[filter] : "Tasks";
  const subtitle = filter
    ? "Filtro da barra lateral"
    : "Quadro Kanban e Gantt — a matriz Eisenhower fica na Home";
  const showBoards = !filter;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl">{title}</h1>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </div>

      {showBoards ? <TasksBoards /> : null}

      {filter ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filter === "completed"
                ? "Cards concluídos"
                : `Cards · ${FILTER_TITLE[filter]}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {tasks.isLoading ? <p className="text-sm">Carregando…</p> : null}
            {tasks.error ? (
              <p className="text-destructive text-sm">
                {(tasks.error as Error).message}
              </p>
            ) : null}
            {!(tasks.isLoading || tasks.error) && filteredTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {filter === "completed"
                  ? "Cards concluídos ainda não são sincronizados do Trello nesta view."
                  : "Nenhuma task neste filtro."}
              </p>
            ) : null}
            {filteredTasks.map((t) => (
              <div
                className="flex items-center justify-between gap-2 text-sm"
                key={t.id}
              >
                <span>{t.name}</span>
                <div className="flex gap-1">
                  {t.overdue ? (
                    <Badge variant="destructive">atrasada</Badge>
                  ) : null}
                  {t.quadrant ? (
                    <Badge variant="secondary">{t.quadrant}</Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
