import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const overview = useQuery(orpc.dashboard.getOverview.queryOptions());

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="font-semibold text-2xl">Productivity Analytics</h1>
      <p className="text-muted-foreground text-sm">
        Indicadores simples — sem score manipulativo de horas trabalhadas.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="font-semibold text-2xl">
            {overview.data?.pendingCount ?? "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Atrasadas</CardTitle>
          </CardHeader>
          <CardContent className="font-semibold text-2xl">
            {overview.data?.overdueCount ?? "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prioritárias</CardTitle>
          </CardHeader>
          <CardContent className="font-semibold text-2xl">
            {overview.data?.priorityTasks.length ?? "—"}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
