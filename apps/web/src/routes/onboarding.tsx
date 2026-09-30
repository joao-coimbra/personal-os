import { Onboarding } from "@personal-os/ui/components/blocks/onboarding-2/components/onboarding";
import { ItemGroup } from "@personal-os/ui/components/item";
import { Gmail } from "@personal-os/ui/components/svgs/gmail";
import { GoogleCalendar } from "@personal-os/ui/components/svgs/googleCalendar";
import { Notion } from "@personal-os/ui/components/svgs/notion";
import { Trello } from "@personal-os/ui/components/svgs/trello";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ConnectProviderCard } from "@/features/integrations/connect-provider-card";
import { authClient } from "@/lib/auth-client";
import {
  type IntegrationProvider,
  parseOAuthPopupMessage,
  reportOAuthOutcome,
} from "@/lib/oauth";
import { client, orpc } from "@/utils/orpc";

const ONBOARDING_STEP_IDS = new Set([
  "welcome",
  "integrations",
  "preferences",
  "goals",
  "ai",
]);

function resolveOnboardingStep(
  rawStep: string | undefined,
  connected: string | undefined
): string | undefined {
  if (rawStep && ONBOARDING_STEP_IDS.has(rawStep)) {
    return rawStep;
  }
  if (connected) {
    return "integrations";
  }
}

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
  ): { connected?: string; error?: string; step?: string } => {
    const rawStep = typeof search.step === "string" ? search.step : undefined;
    const connected =
      typeof search.connected === "string" ? search.connected : undefined;
    return {
      connected,
      error: typeof search.error === "string" ? search.error : undefined,
      step: resolveOnboardingStep(rawStep, connected),
    };
  },
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
    description: "Lê e organiza e-mails para ajudar na triagem de atividades",
    id: "gmail" as const,
    logo: <Gmail aria-hidden="true" />,
    name: "Gmail",
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
  const stepId = search.step ?? "welcome";

  useEffect(() => {
    if (!(search.connected || search.error)) {
      return;
    }

    reportOAuthOutcome(
      { connected: search.connected, error: search.error },
      queryClient
    );

    const nextStep =
      stepId === "welcome" || search.connected ? "integrations" : stepId;
    navigate({
      replace: true,
      search: { step: nextStep },
      to: "/onboarding",
    }).catch(() => undefined);
  }, [navigate, queryClient, search.connected, search.error, stepId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = parseOAuthPopupMessage(event);
      if (!data) {
        return;
      }
      reportOAuthOutcome(data, queryClient);
      if (data.connected) {
        navigate({
          replace: true,
          search: { step: "integrations" },
          to: "/onboarding",
        }).catch(() => undefined);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate, queryClient]);

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
      await navigate({ to: "/home" });
    },
  });

  const disconnect = useMutation({
    mutationFn: (provider: IntegrationProvider) =>
      client.integrations.disconnect({ provider }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const handleFinish = () => {
    finish.mutate();
  };

  const handleSavePreferences = async (prefs: {
    breakMinutes: string;
    focusMinutes: string;
    timezone: string;
    workEnd: string;
    workStart: string;
  }) => {
    await savePrefs.mutateAsync(prefs);
  };

  const handleStepIdChange = (nextStepId: string) => {
    navigate({
      replace: true,
      search: { step: nextStepId },
      to: "/onboarding",
    }).catch(() => undefined);
  };

  return (
    <Onboarding
      integrationsContent={
        <ItemGroup className="gap-3">
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
                returnTo="/onboarding?step=integrations"
              />
            );
          })}
        </ItemGroup>
      }
      isFinishing={finish.isPending}
      isSavingPreferences={savePrefs.isPending}
      onFinish={handleFinish}
      onSavePreferences={handleSavePreferences}
      onStepIdChange={handleStepIdChange}
      stepId={stepId}
    />
  );
}
