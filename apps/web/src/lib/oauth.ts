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

function isDesktopWebview(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function buildStartUrl(
  provider: IntegrationProvider,
  returnTo: string,
  displayMode: "popup" | "page"
): string {
  const params = new URLSearchParams({
    displayMode,
    returnTo,
  });
  return getApiUrl(
    `/api/integrations/oauth/${provider}/start?${params.toString()}`
  );
}

/**
 * Starts provider OAuth.
 * Prefers a popup so the app (especially onboarding) stays in place.
 * Falls back to same-tab redirect on desktop webviews or when popups are blocked.
 */
export function startOAuth(
  provider: IntegrationProvider,
  returnTo = "/integrations"
): void {
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/integrations";

  // Tauri / desktop: keep OAuth in the webview so the callback lands correctly.
  if (isDesktopWebview()) {
    window.location.assign(buildStartUrl(provider, safeReturnTo, "page"));
    return;
  }

  const popupUrl = buildStartUrl(provider, safeReturnTo, "popup");
  const popup = window.open(
    popupUrl,
    "personalos-oauth",
    "popup=yes,width=560,height=720"
  );

  if (!popup) {
    window.location.assign(buildStartUrl(provider, safeReturnTo, "page"));
  }
}
