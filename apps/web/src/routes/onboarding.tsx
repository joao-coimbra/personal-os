import { Button } from "@personal-os/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { Input } from "@personal-os/ui/components/input";
import { Label } from "@personal-os/ui/components/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

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
});

const steps = [
  "welcome",
  "trello",
  "calendar",
  "notion",
  "preferences",
  "ai",
  "done",
] as const;

type Step = (typeof steps)[number];

function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [trelloToken, setTrelloToken] = useState("");
  const [calendarToken, setCalendarToken] = useState("");
  const [notionToken, setNotionToken] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [focusMinutes, setFocusMinutes] = useState("50");
  const [breakMinutes, setBreakMinutes] = useState("15");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const connect = useMutation({
    mutationFn: (input: {
      provider: "trello" | "google_calendar" | "notion";
      token: string;
    }) => client.integrations.connectToken(input),
  });

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

  const next = () => {
    const idx = steps.indexOf(step);
    setStep(steps[Math.min(idx + 1, steps.length - 1)] ?? "done");
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-lg items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>PersonalOS Setup</CardTitle>
          <CardDescription>
            Configure seu espaço pessoal de produtividade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "welcome" && (
            <p className="text-muted-foreground text-sm">
              Conecte suas ferramentas e preferências. Você pode pular
              integrações e configurar depois.
            </p>
          )}
          {step === "trello" && (
            <div className="space-y-2">
              <Label htmlFor="trello-token">Trello token</Label>
              <Input
                id="trello-token"
                onChange={(e) => setTrelloToken(e.target.value)}
                placeholder="Token da API Trello"
                value={trelloToken}
              />
              <Button
                disabled={!trelloToken || connect.isPending}
                onClick={() =>
                  connect.mutate({ provider: "trello", token: trelloToken })
                }
                type="button"
                variant="secondary"
              >
                Connect Trello
              </Button>
            </div>
          )}
          {step === "calendar" && (
            <div className="space-y-2">
              <Label htmlFor="gcal-token">Google Calendar access token</Label>
              <Input
                id="gcal-token"
                onChange={(e) => setCalendarToken(e.target.value)}
                placeholder="OAuth access token"
                value={calendarToken}
              />
              <Button
                disabled={!calendarToken || connect.isPending}
                onClick={() =>
                  connect.mutate({
                    provider: "google_calendar",
                    token: calendarToken,
                  })
                }
                type="button"
                variant="secondary"
              >
                Connect Google Calendar
              </Button>
            </div>
          )}
          {step === "notion" && (
            <div className="space-y-2">
              <Label htmlFor="notion-token">Notion integration token</Label>
              <Input
                id="notion-token"
                onChange={(e) => setNotionToken(e.target.value)}
                placeholder="secret_…"
                value={notionToken}
              />
              <Button
                disabled={!notionToken || connect.isPending}
                onClick={() =>
                  connect.mutate({ provider: "notion", token: notionToken })
                }
                type="button"
                variant="secondary"
              >
                Connect Notion
              </Button>
            </div>
          )}
          {step === "preferences" && (
            <div className="grid gap-3">
              <div>
                <Label htmlFor="tz">Timezone</Label>
                <Input
                  id="tz"
                  onChange={(e) => setTimezone(e.target.value)}
                  value={timezone}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="ws">Início</Label>
                  <Input
                    id="ws"
                    onChange={(e) => setWorkStart(e.target.value)}
                    value={workStart}
                  />
                </div>
                <div>
                  <Label htmlFor="we">Término</Label>
                  <Input
                    id="we"
                    onChange={(e) => setWorkEnd(e.target.value)}
                    value={workEnd}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground text-sm">
              <li>&quot;O que tenho para fazer hoje?&quot;</li>
              <li>&quot;Organize meu dia.&quot;</li>
              <li>
                &quot;Classifique minhas tarefas por urgência e
                importância.&quot;
              </li>
            </ul>
          )}
          {step === "done" && (
            <p className="text-muted-foreground text-sm">
              MCP clients (Cursor, Claude, Gemini) podem ser configurados depois
              em Integrations.
            </p>
          )}
          <div className="flex justify-between gap-2 pt-2">
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
              type="button"
            >
              {step === "done" ? "Entrar no PersonalOS" : "Continuar"}
            </Button>
            {step !== "done" && (
              <Button onClick={next} type="button" variant="ghost">
                Skip
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
