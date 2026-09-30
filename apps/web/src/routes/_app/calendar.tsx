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

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-semibold text-2xl">Calendar</h1>
      <p className="text-muted-foreground text-sm">
        Próximos 7 dias ({formatISO(startOfDay(new Date()))} →{" "}
        {formatISO(addDays(new Date(), 7))})
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.data?.eventsUpcoming.map((e) => (
            <div className="border-b pb-2 last:border-0" key={e.id}>
              <p className="font-medium">{e.summary ?? "Event"}</p>
              <p className="text-muted-foreground text-xs">
                {e.start.dateTime ?? e.start.date} —{" "}
                {e.end.dateTime ?? e.end.date}
              </p>
            </div>
          )) ?? (
            <p className="text-muted-foreground text-sm">
              Nenhum evento ou Calendar não conectado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
