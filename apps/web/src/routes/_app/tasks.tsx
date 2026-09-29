import { Badge } from "@personal-os/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const tasks = useQuery(orpc.tasks.list.queryOptions({ input: {} }));
  const classified = useQuery(orpc.tasks.classify.queryOptions());

  const byQuadrant = new Map<string, typeof classified.data>();
  for (const item of classified.data ?? []) {
    const list = byQuadrant.get(item.quadrant ?? "eliminate") ?? [];
    list.push(item);
    byQuadrant.set(item.quadrant ?? "eliminate", list);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl">Tasks</h1>
        <p className="text-muted-foreground text-sm">
          Trello + Matriz de Eisenhower
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(["do", "schedule", "delegate", "eliminate"] as const).map((q) => (
          <Card key={q}>
            <CardHeader>
              <CardTitle className="text-sm capitalize">{q}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(byQuadrant.get(q) ?? []).slice(0, 6).map((t) => (
                <div className="text-sm" key={t.id}>
                  {t.name}
                </div>
              ))}
              {!byQuadrant.get(q)?.length && (
                <p className="text-muted-foreground text-xs">—</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All open cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.isLoading && <p className="text-sm">Carregando…</p>}
          {tasks.error && (
            <p className="text-destructive text-sm">
              {(tasks.error as Error).message}
            </p>
          )}
          {tasks.data?.map((t) => (
            <div
              className="flex items-center justify-between gap-2 text-sm"
              key={t.id}
            >
              <span>{t.name}</span>
              <div className="flex gap-1">
                {t.overdue && <Badge variant="destructive">overdue</Badge>}
                {t.quadrant && <Badge variant="secondary">{t.quadrant}</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
