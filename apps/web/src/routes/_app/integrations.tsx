/** Integration cards and dialogs bind handlers per provider row. */
// biome-ignore-all lint/performance/noJsxPropsBind: connect/disconnect/prefer handlers per card
// biome-ignore-all lint/correctness/useExhaustiveDependencies: toast side-effects on search params only

import { Button } from "@personal-os/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@personal-os/ui/components/dialog";
import { Input } from "@personal-os/ui/components/input";
import { Label } from "@personal-os/ui/components/label";
import { GoogleCalendar } from "@personal-os/ui/components/svgs/googleCalendar";
import { Notion } from "@personal-os/ui/components/svgs/notion";
import { Trello } from "@personal-os/ui/components/svgs/trello";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Sparkles } from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { ConnectProviderCard } from "@/features/integrations/connect-provider-card";
import type { AiModelProvider, IntegrationProvider } from "@/lib/oauth";
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
    description: "Busca, leitura e notas no workspace",
    id: "notion" as const,
    logo: <Notion aria-hidden="true" />,
    name: "Notion",
  },
] as const;

const aiModels: {
  consoleUrl: string;
  description: string;
  id: AiModelProvider;
  logo: ReactNode;
  name: string;
}[] = [
  {
    consoleUrl: "https://console.anthropic.com/settings/keys",
    description:
      "Cole a API key da Anthropic Console. O operador usa Claude com as tools das integrações.",
    id: "anthropic",
    logo: <Bot aria-hidden="true" className="size-5" />,
    name: "Claude",
  },
  {
    consoleUrl: "https://platform.openai.com/api-keys",
    description:
      "Cole a API key da OpenAI. O operador usa ChatGPT com as tools das integrações.",
    id: "openai",
    logo: <Sparkles aria-hidden="true" className="size-5" />,
    name: "ChatGPT",
  },
];

function IntegrationsPage() {
  const list = useQuery(orpc.integrations.list.queryOptions());
  const prefs = useQuery(orpc.preferences.get.queryOptions());
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const [apiKeyDialog, setApiKeyDialog] = useState<AiModelProvider | null>(
    null
  );
  const [apiKey, setApiKey] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries().catch(() => undefined);
  };

  useEffect(() => {
    if (search.connected) {
      toast.success(`${search.connected.replace("_", " ")} conectado`);
      invalidate();
    }
    if (search.error) {
      toast.error(search.error);
    }
  }, [search.connected, search.error]);

  const disconnect = useMutation({
    mutationFn: (provider: IntegrationProvider) =>
      client.integrations.disconnect({ provider }),
    onSuccess: () => {
      invalidate();
      toast.success("Desconectado");
    },
  });

  const connectApiKey = useMutation({
    mutationFn: (input: { provider: AiModelProvider; apiKey: string }) =>
      client.integrations.connectApiKey(input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Falha ao conectar a API key"
      );
    },
    onSuccess: () => {
      invalidate();
      setApiKeyDialog(null);
      setApiKey("");
      toast.success("Modelo conectado");
    },
  });

  const setPreferred = useMutation({
    mutationFn: (preferredAiProvider: AiModelProvider) =>
      client.preferences.setPreferredAiProvider({ preferredAiProvider }),
    onSuccess: invalidate,
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

  const preferred = prefs.data?.preferredAiProvider ?? null;
  const activeDialogMeta = aiModels.find((m) => m.id === apiKeyDialog);

  const closeApiKeyDialog = () => {
    setApiKeyDialog(null);
    setApiKey("");
  };

  const onApiKeyDialogOpenChange = (open: boolean) => {
    if (!open) {
      closeApiKeyDialog();
    }
  };

  const onApiKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };

  const saveApiKey = () => {
    if (!apiKeyDialog) {
      return;
    }
    connectApiKey.mutate({
      apiKey: apiKey.trim(),
      provider: apiKeyDialog,
    });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <div className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Integrações</h1>
        <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
          Conecte apps via OAuth e modelos de IA via API key. O operador só age
          nas contas autorizadas.
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
          Modelos de IA
        </h2>
        <p className="text-muted-foreground text-sm">
          Conecte Claude ou ChatGPT com uma API key da Console (não é login de
          assinatura). Sem key, o operador usa Gemini do ambiente.
        </p>
        <div className="grid gap-3">
          {aiModels.map((model) => {
            const isConnected = connected.has(model.id);
            const isPreferred = preferred === model.id;
            return (
              <AiModelCard
                disconnectPending={disconnect.isPending}
                isConnected={isConnected}
                isPreferred={isPreferred}
                key={model.id}
                model={model}
                onConnect={() => {
                  setApiKey("");
                  setApiKeyDialog(model.id);
                }}
                onDisconnect={() => disconnect.mutate(model.id)}
                onPrefer={() => setPreferred.mutate(model.id)}
                preferPending={setPreferred.isPending}
              />
            );
          })}
        </div>
      </section>

      <Dialog
        onOpenChange={onApiKeyDialogOpenChange}
        open={apiKeyDialog !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar {activeDialogMeta?.name}</DialogTitle>
            <DialogDescription>
              A key fica criptografada e alimenta o assistente com as tools das
              integrações já conectadas.{" "}
              {activeDialogMeta ? (
                <a
                  className="underline underline-offset-2"
                  href={activeDialogMeta.consoleUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Abrir Console
                </a>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ai-api-key">API key</Label>
            <Input
              autoComplete="off"
              id="ai-api-key"
              onChange={onApiKeyChange}
              placeholder={
                apiKeyDialog === "anthropic" ? "sk-ant-..." : "sk-..."
              }
              type="password"
              value={apiKey}
            />
          </div>
          <DialogFooter>
            <Button onClick={closeApiKeyDialog} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button
              disabled={!apiKey.trim() || connectApiKey.isPending}
              onClick={saveApiKey}
              type="button"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AiModelCard({
  disconnectPending,
  isConnected,
  isPreferred,
  model,
  onConnect,
  onDisconnect,
  onPrefer,
  preferPending,
}: {
  disconnectPending: boolean;
  isConnected: boolean;
  isPreferred: boolean;
  model: (typeof aiModels)[number];
  onConnect: () => void;
  onDisconnect: () => void;
  onPrefer: () => void;
  preferPending: boolean;
}) {
  return (
    <ConnectProviderCard
      description={model.description}
      isConnected={isConnected}
      logo={model.logo}
      name={model.name}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      provider={model.id}
      returnTo="/integrations"
      secondaryAction={
        isConnected ? (
          <Button
            disabled={isPreferred || preferPending || disconnectPending}
            onClick={onPrefer}
            size="sm"
            type="button"
            variant={isPreferred ? "secondary" : "ghost"}
          >
            {isPreferred ? "Modelo ativo" : "Usar este"}
          </Button>
        ) : null
      }
    />
  );
}
