import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiUrl } from "@/lib/server-url";

export type IntegrationProvider =
  | "trello"
  | "google_calendar"
  | "gmail"
  | "notion";

export const OAUTH_POPUP_MESSAGE = "personalos:oauth-complete" as const;

export interface OAuthPopupMessage {
  connected?: string;
  error?: string;
  type: typeof OAUTH_POPUP_MESSAGE;
}

/** Same-origin relative paths only; rejects protocol-relative `//…` open redirects. */
export function safeOAuthReturnTo(raw: string | undefined): string {
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/integrations";
}

function isDesktopWebview(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function buildStartUrl(
  provider: IntegrationProvider,
  returnTo: string,
  displayMode: "popup" | "page"
): string {
  const params = new URLSearchParams({ displayMode, returnTo });
  return getApiUrl(
    `/api/integrations/oauth/${provider}/start?${params.toString()}`
  );
}

/**
 * Starts provider OAuth.
 * Prefers a popup so the app (especially onboarding) stays in place.
 * Falls back to same-tab (page) mode on Tauri/desktop or when popups are blocked.
 */
export function startOAuth(
  provider: IntegrationProvider,
  returnTo = "/integrations"
): void {
  const safeReturnTo = safeOAuthReturnTo(returnTo);

  if (!isDesktopWebview()) {
    const popup = window.open(
      buildStartUrl(provider, safeReturnTo, "popup"),
      "personalos-oauth",
      "popup=yes,width=560,height=720"
    );
    if (popup) {
      return;
    }
  }

  window.location.assign(buildStartUrl(provider, safeReturnTo, "page"));
}

export function isOAuthPopupMessage(data: unknown): data is OAuthPopupMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as OAuthPopupMessage).type === OAUTH_POPUP_MESSAGE
  );
}

/** Validates origin + protocol; returns null for unrelated messages. */
export function parseOAuthPopupMessage(
  event: MessageEvent
): OAuthPopupMessage | null {
  if (event.origin !== window.location.origin) {
    return null;
  }
  return isOAuthPopupMessage(event.data) ? event.data : null;
}

/** Toast + invalidate after OAuth success/error (URL params or popup message). */
export function reportOAuthOutcome(
  outcome: { connected?: string; error?: string },
  queryClient: QueryClient
): void {
  if (outcome.connected) {
    toast.success(`${outcome.connected.replaceAll("_", " ")} conectado`);
    queryClient.invalidateQueries().catch(() => undefined);
  }
  if (outcome.error) {
    toast.error(outcome.error);
  }
}
