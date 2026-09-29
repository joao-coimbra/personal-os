import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { client } from "@/utils/orpc";

export const Route = createFileRoute("/oauth/trello")({
  component: TrelloOAuthCallback,
  validateSearch: (
    search: Record<string, unknown>
  ): { returnTo?: string; state?: string } => ({
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
  }),
});

function TrelloOAuthCallback() {
  const { returnTo } = Route.useSearch();
  const [message, setMessage] = useState("Conectando Trello…");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    if (!token) {
      setMessage("Token do Trello não encontrado. Tente conectar novamente.");
      return;
    }

    void client.integrations
      .connectToken({ provider: "trello", token })
      .then(() => {
        setMessage("Trello conectado.");
        const target =
          returnTo?.startsWith("/") && !returnTo.startsWith("//")
            ? returnTo
            : "/integrations";
        window.location.assign(`${target}?connected=trello`);
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : "Falha ao conectar Trello"
        );
      });
  }, [returnTo]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100 via-background to-background px-6">
      <div className="max-w-md text-center">
        <p className="font-medium text-lg tracking-tight">PersonalOS</p>
        <p className="mt-3 text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}
