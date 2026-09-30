import { Button } from "@personal-os/ui/components/button";
import { Input } from "@personal-os/ui/components/input";
import { Label } from "@personal-os/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Kanban, NotebookPen, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PersonalOsLogo } from "@/components/personal-os-logo";
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

const steps = ["welcome", "integrations", "preferences", "ai", "done"] as const;

type Step = (typeof steps)[number];

function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [focusMinutes, setFocusMinutes] = useState("50");
  const [breakMinutes, setBreakMinutes] = useState("15");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const integrations = useQuery(orpc.integrations.list.queryOptions());
  const search = Route.useSearch();

  useEffect(() => {
    if (search.connected) {
      setStep("integrations");
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
    mutationFn: () =>
      client.preferences.upsert({
        breakMinutes: Number(breakMinutes),
        focusMinutes: Number(focusMinutes),
        timezone,
        workEnd,
        workStart,
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

  const next = () => {
    const idx = steps.indexOf(step);
    setStep(steps[Math.min(idx + 1, steps.length - 1)] ?? "done");
  };

  const stepIndex = steps.indexOf(step) + 1;

  return (
    <div className="relative min-h-svh overflow-hidden bg-[radial-gradient(1200px_circle_at_10%_-10%,oklch(0.92_0.04_230),transparent),radial-gradient(900px_circle_at_90%_0%,oklch(0.93_0.05_150),transparent)]">
      <div className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <PersonalOsLogo
              className="mb-3"
              markClassName="size-8"
              withWordmark
            />
            <h1 className="mt-2 font-semibold text-3xl tracking-tight">
              Seu sistema operacional pessoal
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {stepIndex}/{steps.length}
          </p>
        </div>

        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500"
            style={{ width: `${(stepIndex / steps.length) * 100}%` }}
          />
        </div>

        <div className="rounded-3xl border bg-background/80 p-6 shadow-xl backdrop-blur md:p-8">
          {step === "welcome" && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-sm">
                <Sparkles className="size-4" />
                Setup em poucos minutos
              </div>
              <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
                Conecte Trello, Calendar e Notion com um clique. O operador de
                IA usa essas ferramentas para priorizar, planejar e criar blocos
                de foco — sem colar tokens.
              </p>
            </div>
          )}

          {step === "integrations" && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-xl">
                  Conecte suas ferramentas
                </h2>
                <p className="text-muted-foreground text-sm">
                  Um botão. Autorização oficial. Você pode pular e conectar
                  depois.
                </p>
              </div>
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
            </div>
          )}

          {step === "preferences" && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-xl">Seu ritmo de trabalho</h2>
                <p className="text-muted-foreground text-sm">
                  O planner respeita horários e pausas.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="tz">Timezone</Label>
                  <Input
                    id="tz"
                    onChange={(e) => setTimezone(e.target.value)}
                    value={timezone}
                  />
                </div>
                <div>
                  <Label htmlFor="ws">Início</Label>
                  <Input
                    id="ws"
                    onChange={(e) => setWorkStart(e.target.value)}
                    type="time"
                    value={workStart}
                  />
                </div>
                <div>
                  <Label htmlFor="we">Término</Label>
                  <Input
                    id="we"
                    onChange={(e) => setWorkEnd(e.target.value)}
                    type="time"
                    value={workEnd}
                  />
                </div>
                <div>
                  <Label htmlFor="focus">Focus (min)</Label>
                  <Input
                    id="focus"
                    onChange={(e) => setFocusMinutes(e.target.value)}
                    value={focusMinutes}
                  />
                </div>
                <div>
                  <Label htmlFor="break">Pausa (min)</Label>
                  <Input
                    id="break"
                    onChange={(e) => setBreakMinutes(e.target.value)}
                    value={breakMinutes}
                  />
                </div>
              </div>
            </div>
          )}

          {step === "ai" && (
            <div className="space-y-4">
              <h2 className="font-semibold text-xl">Operador de IA</h2>
              <p className="text-muted-foreground text-sm">
                Depois do setup, abra o painel com ⌘K / Ctrl+K e experimente:
              </p>
              <ul className="space-y-2">
                {[
                  "O que tenho para fazer hoje?",
                  "Organize meu dia respeitando 09–18h.",
                  "Classifique minhas tarefas por urgência e importância.",
                ].map((prompt) => (
                  <li
                    className="rounded-xl border bg-muted/40 px-4 py-3 text-sm"
                    key={prompt}
                  >
                    “{prompt}”
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3">
              <h2 className="font-semibold text-xl">Tudo pronto</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Seu dashboard, tarefas e operador já estão disponíveis. Clientes
                MCP (Cursor, Claude) podem ser configurados em Integrações.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-between gap-2">
            <Button
              onClick={() => {
                if (step === "preferences") {
                  savePrefs.mutate(undefined, { onSuccess: next });
                  return;
                }
                if (step === "done") {
                  finish.mutate();
                  return;
                }
                next();
              }}
              size="lg"
              type="button"
            >
              {step === "done" ? "Entrar no PersonalOS" : "Continuar"}
            </Button>
            {step !== "done" && step !== "welcome" && (
              <Button onClick={next} size="lg" type="button" variant="ghost">
                Pular
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
