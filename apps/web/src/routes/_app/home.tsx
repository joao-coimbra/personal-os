import { Badge } from "@personal-os/ui/components/badge";
import { Button } from "@personal-os/ui/components/button";
import { Skeleton } from "@personal-os/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ListTodo, Sparkles } from "lucide-react";

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
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  const data = overview.data;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl border bg-[radial-gradient(900px_circle_at_0%_0%,oklch(0.93_0.04_220),transparent),radial-gradient(700px_circle_at_100%_0%,oklch(0.94_0.05_150),transparent)] p-8">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <p className="text-muted-foreground text-sm uppercase tracking-[0.18em]">
              PersonalOS
            </p>
            <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">
              {greeting}. Foque no que importa.
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tarefas, agenda e IA no mesmo espaço. Peça ao operador para
              priorizar ou planejar o dia.
            </p>
          </div>
          <Button onClick={() => setOperatorOpen(true)} size="lg" type="button">
            <Sparkles className="size-4" />
            Abrir operador
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pendentes" value={data?.pendingCount ?? 0} />
        <Stat label="Atrasadas" value={data?.overdueCount ?? 0} />
        <Stat label="Prioritárias" value={data?.priorityTasks.length ?? 0} />
        <Stat label="Eventos" value={data?.eventsUpcoming.length ?? 0} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Panel
          action={
            <Button render={<Link to="/tasks" />} size="sm" variant="ghost">
              Ver tarefas
            </Button>
          }
          icon={ListTodo}
          title="Prioridade (Eisenhower)"
        >
          {(data?.priorityTasks.length ?? 0) === 0 ? (
            <Empty hint="Conecte o Trello e peça ao AI para classificar." />
          ) : (
            <ul className="space-y-2">
              {data?.priorityTasks.slice(0, 6).map((task) => (
                <li
                  className="flex items-center justify-between gap-2 rounded-xl border bg-background/70 px-3 py-2 text-sm"
                  key={task.id}
                >
                  <span className="truncate">{task.name}</span>
                  {task.quadrant ? (
                    <Badge variant="secondary">{task.quadrant}</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          action={
            <Button render={<Link to="/calendar" />} size="sm" variant="ghost">
              Ver agenda
            </Button>
          }
          icon={CalendarDays}
          title="Próximos eventos"
        >
          {(data?.eventsUpcoming.length ?? 0) === 0 ? (
            <Empty hint="Conecte o Google Calendar para ver compromissos." />
          ) : (
            <ul className="space-y-2">
              {data?.eventsUpcoming.slice(0, 6).map((event) => (
                <li
                  className="rounded-xl border bg-background/70 px-3 py-2 text-sm"
                  key={event.id}
                >
                  <p className="font-medium">{event.summary ?? "Evento"}</p>
                  <p className="text-muted-foreground text-xs">
                    {event.start.dateTime ?? event.start.date}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card/80 px-4 py-4">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 font-semibold text-3xl tabular-nums">{value}</p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof ListTodo;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border bg-card/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Icon className="size-4" />
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty({ hint }: { hint: string }) {
  return <p className="text-muted-foreground text-sm">{hint}</p>;
}
