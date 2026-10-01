import { Button } from "@personal-os/ui/components/button";
import { Skeleton } from "@personal-os/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Sparkles } from "lucide-react";

import { AuthSplash } from "@/components/blocks/auth-16/components/auth-splash";
import { EisenhowerMatrix } from "@/features/home/eisenhower-matrix";
import { useUiStore } from "@/stores/ui-store";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
  pendingComponent: AuthSplash,
});

function openOperator() {
  useUiStore.getState().setOperatorOpen(true);
}

function HomePage() {
  const overview = useQuery(orpc.dashboard.getOverview.queryOptions());

  if (overview.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  const { data } = overview;
  const hour = new Date().getHours();
  let greeting = "Boa noite";
  if (hour < 12) {
    greeting = "Bom dia";
  } else if (hour < 18) {
    greeting = "Boa tarde";
  }

  const matrixTasks = data?.matrixTasks ?? data?.priorityTasks ?? [];

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
              Tarefas, agenda e IA no mesmo espaço. A matriz Eisenhower atualiza
              sozinha conforme o Trello sincroniza.
            </p>
          </div>
          <Button onClick={openOperator} size="lg" type="button">
            <Sparkles className="size-4" />
            Abrir operador
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pendentes" value={data?.pendingCount ?? 0} />
        <Stat label="Atrasadas" value={data?.overdueCount ?? 0} />
        <Stat
          label="A fazer / agendar"
          value={data?.priorityTasks.length ?? 0}
        />
        <Stat label="Eventos" value={data?.eventsUpcoming.length ?? 0} />
      </section>

      <EisenhowerMatrix tasks={matrixTasks} />

      <section className="rounded-3xl border bg-card/70 p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <CalendarDays className="size-4" />
            Próximos eventos
          </div>
          <Button render={<Link to="/calendar" />} size="sm" variant="ghost">
            Ver agenda
          </Button>
        </div>
        {(data?.eventsUpcoming.length ?? 0) === 0 ? (
          <p className="text-muted-foreground text-sm">
            Conecte o Google Calendar para ver compromissos. Se a API retornar
            403, o operador degrada e segue com notas/tarefas.
          </p>
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
