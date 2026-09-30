import { Onboarding } from "@personal-os/ui/components/blocks/onboarding-2/components/onboarding";
import { ItemGroup } from "@personal-os/ui/components/item";
import { GoogleCalendar } from "@personal-os/ui/components/svgs/googleCalendar";
import { Notion } from "@personal-os/ui/components/svgs/notion";
import { Trello } from "@personal-os/ui/components/svgs/trello";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ConnectProviderCard } from "@/features/integrations/connect-provider-card";
import { authClient } from "@/lib/auth-client";
import type { IntegrationProvider } from "@/lib/oauth";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    const prefs = await client.preferences.get();
    if (prefs?.onboardingCompletedAt) {
      throw redirect({ to: "/home" });
    }
  },
  component: OnboardingPage,
  validateSearch: (
    search: Record<string, unknown>
  ): { connected?: string } => ({
    connected:
      typeof search.connected === "string" ? search.connected : undefined,
  }),
});

const onboardingProviders = [
  {
    description: "Boards, cards e prioridades Eisenhower",
    id: "trello" as const,
    logo: <Trello aria-hidden="true" />,
    name: "Trello",
  },
  {
    connectedDescription: "Já vinculado pelo login Google",
    description: "Agenda e blocos de foco no calendário",
    id: "google_calendar" as const,
    logo: <GoogleCalendar aria-hidden="true" />,
    name: "Google Calendar",
  },
  {
    description: "Notas e base de conhecimento para o operador",
    id: "notion" as const,
    logo: <Notion aria-hidden="true" />,
    name: "Notion",
  },
] as const;

function providerDescription(
  provider: (typeof onboardingProviders)[number],
  isConnected: boolean
): string {
  if (isConnected && "connectedDescription" in provider) {
    return provider.connectedDescription;
  }

  return provider.description;
}

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const integrations = useQuery(orpc.integrations.list.queryOptions());
  const search = Route.useSearch();

  useEffect(() => {
    if (search.connected) {
      void queryClient.invalidateQueries();
    }
  }, [queryClient, search.connected]);

  const connected = useMemo(() => {
    const providers = new Set(
      (integrations.data ?? [])
        .filter((integration) => integration.status === "connected")
        .map((integration) => integration.provider)
    );

    if (search.connected) {
      providers.add(search.connected as IntegrationProvider);
    }

    return providers;
  }, [integrations.data, search.connected]);

  const savePrefs = useMutation({
    mutationFn: (input: {
      breakMinutes: string;
      focusMinutes: string;
      timezone: string;
      workEnd: string;
      workStart: string;
    }) =>
      client.preferences.upsert({
        breakMinutes: Number(input.breakMinutes),
        focusMinutes: Number(input.focusMinutes),
        timezone: input.timezone,
        workEnd: input.workEnd,
        workStart: input.workStart,
      }),
  });

  const finish = useMutation({
    mutationFn: () => client.preferences.completeOnboarding(),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      navigate({ to: "/home" });
    },
  });

  const disconnect = useMutation({
    mutationFn: (provider: IntegrationProvider) =>
      client.integrations.disconnect({ provider }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <Onboarding
      integrationsContent={
        <ItemGroup className="gap-2">
          {onboardingProviders.map((provider) => {
            const isConnected = connected.has(provider.id);

            return (
              <ConnectProviderCard
                description={providerDescription(provider, isConnected)}
                isConnected={isConnected}
                key={provider.id}
                logo={provider.logo}
                name={provider.name}
                onDisconnect={() => disconnect.mutate(provider.id)}
                provider={provider.id}
                returnTo="/onboarding"
              />
            );
          })}
        </ItemGroup>
      }
      isFinishing={finish.isPending}
      isSavingPreferences={savePrefs.isPending}
      onFinish={() => finish.mutate()}
      onSavePreferences={async (prefs) => {
        await savePrefs.mutateAsync(prefs);
      }}
    />
  );
}
