import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { safeOAuthReturnTo } from "@/lib/oauth";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/oauth/trello")({
  component: TrelloOAuthCallback,
  validateSearch: (
    search: Record<string, unknown>
  ): {
    displayMode?: "popup" | "page";
    returnTo?: string;
    state?: string;
  } => ({
    displayMode:
      search.displayMode === "popup" || search.displayMode === "page"
        ? search.displayMode
        : undefined,
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
  }),
});

function completeUrl(
  returnTo: string | undefined,
  displayMode: "popup" | "page" | undefined,
  extras: Record<string, string>
): string {
  const safeReturnTo = safeOAuthReturnTo(returnTo);
  if (displayMode === "popup") {
    const url = new URL("/oauth/popup-done", window.location.origin);
    url.searchParams.set("returnTo", safeReturnTo);
    for (const [key, value] of Object.entries(extras)) {
      url.searchParams.set(key, value);
    }
    return `${url.pathname}${url.search}`;
  }
  const url = new URL(safeReturnTo, window.location.origin);
  for (const [key, value] of Object.entries(extras)) {
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}`;
}

function TrelloOAuthCallback() {
  const { displayMode, returnTo } = Route.useSearch();
  const [message, setMessage] = useState("Conectando Trello…");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    const hashError = params.get("error");

    if (hashError || !token) {
      const error =
        hashError ??
        "Token do Trello não encontrado. Tente conectar novamente.";
      setMessage(error);
      window.location.assign(completeUrl(returnTo, displayMode, { error }));
      return;
    }

    void client.integrations
      .connectToken({ provider: "trello", token })
      .then(() => {
        setMessage("Trello conectado.");
        window.location.assign(
          completeUrl(returnTo, displayMode, { connected: "trello" })
        );
      })
      .catch((error: unknown) => {
        const text =
          error instanceof Error ? error.message : "Falha ao conectar Trello";
        setMessage(text);
        window.location.assign(
          completeUrl(returnTo, displayMode, { error: text })
        );
      });
  }, [displayMode, returnTo]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100 via-background to-background px-6">
      <div className="max-w-md text-center">
        <p className="font-medium text-lg tracking-tight">PersonalOS</p>
        <p className="mt-3 text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}
