import { Badge } from "@personal-os/ui/components/badge";
import { Button } from "@personal-os/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { Input } from "@personal-os/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/integrations")({
  component: IntegrationsPage,
});

const apps = [
  {
    id: "trello" as const,
    name: "Trello",
    description: "Tasks & project management",
  },
  {
    id: "google_calendar" as const,
    name: "Google Calendar",
    description: "Calendar & time blocking",
  },
  { id: "notion" as const, name: "Notion", description: "Notes & knowledge" },
];

const aiClients = ["Claude", "Cursor", "Gemini"];

function IntegrationsPage() {
  const list = useQuery(orpc.integrations.list.queryOptions());
  const queryClient = useQueryClient();
  const [tokens, setTokens] = useState<Record<string, string>>({});

  const connect = useMutation({
    mutationFn: (input: {
      provider: "trello" | "google_calendar" | "notion";
      token: string;
    }) => client.integrations.connectToken(input),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const disconnect = useMutation({
    mutationFn: (provider: "trello" | "google_calendar" | "notion") =>
      client.integrations.disconnect({ provider }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const statusFor = (provider: string) =>
    list.data?.find((i) => i.provider === provider)?.status ?? "disconnected";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="font-semibold text-2xl">Integrations</h1>
        <p className="text-muted-foreground text-sm">
          Apps & Services vs AI Clients
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="font-medium text-sm uppercase tracking-wide">
          Apps & Services
        </h2>
        {apps.map((app) => (
          <Card key={app.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {app.name}
                <Badge
                  variant={
                    statusFor(app.id) === "connected" ? "default" : "secondary"
                  }
                >
                  {statusFor(app.id)}
                </Badge>
              </CardTitle>
              <CardDescription>{app.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Input
                className="max-w-md"
                onChange={(e) =>
                  setTokens((s) => ({ ...s, [app.id]: e.target.value }))
                }
                placeholder="Access token"
                value={tokens[app.id] ?? ""}
              />
              <Button
                disabled={!tokens[app.id] || connect.isPending}
                onClick={() =>
                  connect.mutate({
                    provider: app.id,
                    token: tokens[app.id] ?? "",
                  })
                }
                type="button"
              >
                Connect
              </Button>
              <Button
                onClick={() => disconnect.mutate(app.id)}
                type="button"
                variant="outline"
              >
                Disconnect
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-medium text-sm uppercase tracking-wide">
          AI Clients (MCP)
        </h2>
        {aiClients.map((name) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle className="text-base">{name}</CardTitle>
              <CardDescription>
                Setup available — configure PersonalOS MCP URL after server
                deploy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Configured</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
