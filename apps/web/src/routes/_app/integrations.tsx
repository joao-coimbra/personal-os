import { Badge } from "@personal-os/ui/components/badge";
import { Gmail } from "@personal-os/ui/components/svgs/gmail";
import { GoogleCalendar } from "@personal-os/ui/components/svgs/googleCalendar";
import { Notion } from "@personal-os/ui/components/svgs/notion";
import { Trello } from "@personal-os/ui/components/svgs/trello";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { ConnectProviderCard } from "@/features/integrations/connect-provider-card";
import {
  type IntegrationProvider,
  OAUTH_POPUP_MESSAGE,
  type OAuthPopupMessage,
} from "@/lib/oauth";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/integrations")({
  component: IntegrationsPage,
  validateSearch: (
    search: Record<string, unknown>
  ): { connected?: string; error?: string } => ({
    connected:
      typeof search.connected === "string" ? search.connected : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
});

const apps = [
  {
    description: "Boards, cards e prioridades Eisenhower",
    id: "trello" as const,
    logo: <Trello aria-hidden="true" />,
    name: "Trello",
  },
  {
    description: "Eventos e blocos de foco no calendário",
    id: "google_calendar" as const,
    logo: <GoogleCalendar aria-hidden="true" />,
    name: "Google Calendar",
  },
  {
    description: "Lê e organiza e-mails para ajudar na triagem de atividades",
    id: "gmail" as const,
    logo: <Gmail aria-hidden="true" />,
    name: "Gmail",
  },
  {
    description: "Busca, leitura e notas no workspace",
    id: "notion" as const,
    logo: <Notion aria-hidden="true" />,
    name: "Notion",
  },
] as const;

const aiClients = [
  {
    description:
      "Adicione a URL MCP do PersonalOS nas configurações do Claude.",
    name: "Claude",
  },
  {
    description: "Configure o servidor MCP em Cursor Settings → MCP.",
    name: "Cursor",
  },
  {
    description: "Use o endpoint MCP com token pessoal quando disponível.",
    name: "Gemini",
  },
] as const;

function IntegrationsPage() {
  const list = useQuery(orpc.integrations.list.queryOptions());
  const queryClient = useQueryClient();
  const search = Route.useSearch();

  useEffect(() => {
    if (search.connected) {
      toast.success(`${search.connected.replaceAll("_", " ")} conectado`);
      queryClient.invalidateQueries().catch(() => undefined);
    }
    if (search.error) {
      toast.error(search.error);
    }
  }, [queryClient, search.connected, search.error]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as OAuthPopupMessage | null;
      if (!data || data.type !== OAUTH_POPUP_MESSAGE) {
        return;
      }
      if (data.connected) {
        toast.success(`${data.connected.replaceAll("_", " ")} conectado`);
        queryClient.invalidateQueries().catch(() => undefined);
      }
      if (data.error) {
        toast.error(data.error);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [queryClient]);

  const disconnect = useMutation({
    mutationFn: (provider: IntegrationProvider) =>
      client.integrations.disconnect({ provider }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const connected = useMemo(
    () =>
      new Set(
        (list.data ?? [])
          .filter((integration) => integration.status === "connected")
          .map((integration) => integration.provider)
      ),
    [list.data]
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <div className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Integrações</h1>
        <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
          Conecte com um clique via OAuth. O operador de IA só age nas contas
          autorizadas.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">
          Apps & Services
        </h2>
        {apps.map((app) => (
          <ConnectProviderCard
            description={app.description}
            isConnected={connected.has(app.id)}
            key={app.id}
            logo={app.logo}
            name={app.name}
            onDisconnect={() => disconnect.mutate(app.id)}
            provider={app.id}
            returnTo="/integrations"
          />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]">
          AI Clients (MCP)
        </h2>
        <div className="grid gap-3">
          {aiClients.map((clientMeta) => (
            <div
              className="rounded-2xl border bg-card/70 px-5 py-4"
              key={clientMeta.name}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{clientMeta.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {clientMeta.description}
                  </p>
                </div>
                <Badge variant="outline">Setup disponível</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
