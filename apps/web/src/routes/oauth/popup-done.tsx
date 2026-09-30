import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { OAUTH_POPUP_MESSAGE, type OAuthPopupMessage } from "@/lib/oauth";

export const Route = createFileRoute("/oauth/popup-done")({
  component: OAuthPopupDonePage,
  validateSearch: (
    search: Record<string, unknown>
  ): { connected?: string; error?: string; returnTo?: string } => ({
    connected:
      typeof search.connected === "string" ? search.connected : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
  }),
});

function OAuthPopupDonePage() {
  const { connected, error, returnTo } = Route.useSearch();
  const [message, setMessage] = useState("Concluindo conexão…");
  const [needsManualClose, setNeedsManualClose] = useState(false);

  useEffect(() => {
    const payload: OAuthPopupMessage = {
      connected,
      error,
      type: OAUTH_POPUP_MESSAGE,
    };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
      setMessage(
        error
          ? "Não foi possível conectar. Pode fechar esta janela."
          : "Conectado. Fechando…"
      );
      window.close();
      // Browsers may ignore window.close() when the popup wasn't script-opened.
      const timer = window.setTimeout(() => {
        setNeedsManualClose(true);
        setMessage(
          error
            ? "Não foi possível conectar. Feche esta janela para voltar."
            : "Conectado. Feche esta janela para voltar ao PersonalOS."
        );
      }, 400);
      return () => window.clearTimeout(timer);
    }

    const target =
      returnTo?.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/integrations";
    const url = new URL(target, window.location.origin);
    if (connected) {
      url.searchParams.set("connected", connected);
    }
    if (error) {
      url.searchParams.set("error", error);
    }
    window.location.replace(`${url.pathname}${url.search}`);
  }, [connected, error, returnTo]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100 via-background to-background px-6">
      <div className="max-w-md text-center">
        <p className="font-medium text-lg tracking-tight">PersonalOS</p>
        <p className="mt-3 text-muted-foreground text-sm">{message}</p>
        {needsManualClose ? (
          <button
            className="mt-6 inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 font-medium text-sm transition-colors hover:bg-muted"
            onClick={() => window.close()}
            type="button"
          >
            Fechar janela
          </button>
        ) : null}
      </div>
    </div>
  );
}
