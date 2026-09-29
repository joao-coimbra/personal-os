import { Badge } from "@personal-os/ui/components/badge";
import { Button } from "@personal-os/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { Skeleton } from "@personal-os/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { useUiStore } from "@/stores/ui-store";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function HomePage() {
  const setOperatorOpen = useUiStore((s) => s.setOperatorOpen);
  const overview = useQuery(orpc.dashboard.getOverview.queryOptions());

  if (overview.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const data = overview.data;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">
            Today&apos;s Overview
          </h1>
          <p className="text-muted-foreground text-sm">
            Visão unificada de tarefas, compromissos e prioridades.
          </p>
        </div>
        <Button onClick={() => setOperatorOpen(true)} type="button">
          <Sparkles className="size-4" />
          Perguntar ao AI
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pendentes" value={data?.pendingCount ?? 0} />
        <StatCard label="Atrasadas" value={data?.overdueCount ?? 0} />
        <StatCard
          label="Prioritárias"
          value={data?.priorityTasks.length ?? 0}
        />
        <StatCard
          label="Eventos (7d)"
          value={data?.eventsUpcoming.length ?? 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.priorityTasks.length ? (
              data.priorityTasks.map((t) => (
                <div
                  className="flex items-center justify-between gap-2 text-sm"
                  key={t.id}
                >
                  <span>{t.name}</span>
                  <Badge variant="secondary">{t.quadrant}</Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                Conecte o Trello em Integrations.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.eventsUpcoming.length ? (
              data.eventsUpcoming.map((e) => (
                <div className="text-sm" key={e.id}>
                  <p className="font-medium">{e.summary ?? "Event"}</p>
                  <p className="text-muted-foreground text-xs">
                    {e.start.dateTime ?? e.start.date}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                Conecte o Google Calendar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            render={<Link to="/integrations" />}
            size="sm"
            variant="outline"
          >
            Integrations
          </Button>
          <Button render={<Link to="/tasks" />} size="sm" variant="outline">
            Tasks
          </Button>
          <Button render={<Link to="/files" />} size="sm" variant="outline">
            Files
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </p>
        <p className="font-semibold text-3xl tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
