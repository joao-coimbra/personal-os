import { Onboarding } from "@personal-os/ui/components/blocks/onboarding-3/components/onboarding";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Kanban, NotebookPen } from "lucide-react";
import { useEffect, useMemo } from "react";
import { ConnectProviderCard } from "@/features/integrations/connect-provider-card";
import { authClient } from "@/lib/auth-client";
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
    const map = new Set(
      (integrations.data ?? [])
        .filter((i) => i.status === "connected")
        .map((i) => i.provider)
    );
    if (search.connected) {
      map.add(search.connected as "trello" | "google_calendar" | "notion");
    }
    return map;
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
    mutationFn: (provider: "trello" | "google_calendar" | "notion") =>
      client.integrations.disconnect({ provider }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <Onboarding
      integrationsContent={
        <>
          <ConnectProviderCard
            accentClassName="bg-[#0079BF]"
            description="Tarefas, boards e prioridades Eisenhower"
            icon={Kanban}
            isConnected={connected.has("trello")}
            name="Trello"
            onDisconnect={() => disconnect.mutate("trello")}
            provider="trello"
            returnTo="/onboarding"
          />
          <ConnectProviderCard
            accentClassName="bg-[#4285F4]"
            description={
              connected.has("google_calendar")
                ? "Já vinculado pelo login Google (Calendar)"
                : "Agenda e time blocking — também via login Google"
            }
            icon={CalendarDays}
            isConnected={connected.has("google_calendar")}
            name="Google Calendar"
            onDisconnect={() => disconnect.mutate("google_calendar")}
            provider="google_calendar"
            returnTo="/onboarding"
          />
          <ConnectProviderCard
            accentClassName="bg-[#111111]"
            description="Notas e base de conhecimento"
            icon={NotebookPen}
            isConnected={connected.has("notion")}
            name="Notion"
            onDisconnect={() => disconnect.mutate("notion")}
            provider="notion"
            returnTo="/onboarding"
          />
        </>
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
