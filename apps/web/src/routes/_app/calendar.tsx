import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, formatISO, startOfDay } from "date-fns";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const overview = useQuery(orpc.dashboard.getOverview.queryOptions());
  const tasks = useQuery(orpc.tasks.list.queryOptions({ input: {} }));

  const googleEvents = overview.data?.eventsUpcoming ?? [];
  const dueTasks = (tasks.data ?? []).filter((task) => task.due);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-semibold text-2xl">Calendar</h1>
      <p className="text-muted-foreground text-sm">
        Próximos 7 dias ({formatISO(startOfDay(new Date()))} →{" "}
        {formatISO(addDays(new Date(), 7))})
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events (Google Calendar)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {googleEvents.map((e) => (
            <div className="border-b pb-2 last:border-0" key={e.id}>
              <p className="font-medium">{e.summary ?? "Event"}</p>
              <p className="text-muted-foreground text-xs">
                {e.start.dateTime ?? e.start.date} —{" "}
                {e.end.dateTime ?? e.end.date}
              </p>
            </div>
          ))}
          {googleEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum evento do Google Calendar. Se o OAuth está conectado mas a
              API retorna 403, habilite{" "}
              <span className="font-medium text-foreground">Calendar API</span>{" "}
              no projeto GCP do client OAuth e rode{" "}
              <code className="rounded bg-muted px-1">bun run seed</code>.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prazos (Trello)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dueTasks.map((task) => (
            <div className="border-b pb-2 last:border-0" key={task.id}>
              <p className="font-medium">{task.name}</p>
              <p className="text-muted-foreground text-xs">
                Due {task.due}
                {task.overdue ? " · atrasada" : ""}
              </p>
            </div>
          ))}
          {dueTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum card com due date no board seed.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
