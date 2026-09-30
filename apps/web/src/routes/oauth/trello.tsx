import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Legacy fragment callback from classic Trello authorize.
 * Current flow uses Atlassian OAuth 2.0 server callback —
 * `/api/integrations/oauth/trello/callback` — so this page only redirects.
 */
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

  useEffect(() => {
    const target =
      returnTo?.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/integrations";
    window.location.assign(
      `${target}?error=${encodeURIComponent(
        "Use Conectar Trello novamente. O fluxo agora é OAuth 2.0 via Atlassian."
      )}`
    );
  }, [returnTo]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100 via-background to-background px-6">
      <div className="max-w-md text-center">
        <p className="font-medium text-lg tracking-tight">PersonalOS</p>
        <p className="mt-3 text-muted-foreground text-sm">
          Redirecionando para Integrações…
        </p>
      </div>
    </div>
  );
}
