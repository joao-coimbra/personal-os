import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { getApiUrl, getAppUrl } from "@/lib/server-url";

export type OAuthIntegrationProvider =
  | "trello"
  | "google_calendar"
  | "gmail"
  | "notion";

export type AiModelProvider = "anthropic" | "openai";

export type IntegrationProvider = OAuthIntegrationProvider | AiModelProvider;

/** Same Calendar scopes Better Auth Google login requests. */
const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

const OAUTH_CONSOLE_HINT_RE = /redirect_uri|invalid_request|access_denied/i;

/**
 * Better Auth Google callback — used for login AND Calendar Connect (linkSocial).
 * Must be registered in Google Cloud Console → Authorized redirect URIs.
 */
export function googleAuthRedirectUri(): string {
  return getApiUrl("/api/auth/callback/google");
}

/** Custom Connect callbacks (Gmail / legacy Calendar / Notion). */
export function integrationOAuthRedirectUri(
  provider: OAuthIntegrationProvider
): string {
  return getApiUrl(`/api/integrations/oauth/${provider}/callback`);
}

function withQueryParam(returnTo: string, key: string, value: string): string {
  const url = new URL(returnTo, window.location.origin);
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

/**
 * Google Calendar Connect uses Better Auth `linkSocial` so redirect_uri matches
 * login (`/api/auth/callback/google`). Custom `/api/integrations/oauth/google_calendar/*`
 * remains for legacy/API callers but is not used by the Connect button.
 */
async function connectGoogleCalendar(returnTo: string): Promise<void> {
  const expectedUri = googleAuthRedirectUri();
  const callbackURL = getAppUrl(
    withQueryParam(returnTo, "connected", "google_calendar")
  );
  const errorCallbackURL = getAppUrl(returnTo);

  await authClient.linkSocial(
    {
      callbackURL,
      errorCallbackURL,
      provider: "google",
      scopes: [...GOOGLE_CALENDAR_SCOPES],
    },
    {
      onError: (ctx) => {
        const message =
          ctx.error.message || "Falha ao conectar Google Calendar";
        if (OAUTH_CONSOLE_HINT_RE.test(message)) {
          toast.error(
            `${message} Registre no Google Cloud Console: ${expectedUri}`,
            { duration: 20_000 }
          );
          return;
        }
        toast.error(message);
      },
    }
  );
}

export function startOAuth(
  provider: OAuthIntegrationProvider,
  returnTo = "/integrations"
): void {
  if (provider === "google_calendar") {
    connectGoogleCalendar(returnTo).catch(() => undefined);
    return;
  }

  const url = getApiUrl(
    `/api/integrations/oauth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`
  );
  window.location.assign(url);
}

/** User-facing hint when OAuth comes back with redirect_uri_mismatch. */
export function oauthMismatchHint(provider: OAuthIntegrationProvider): string {
  if (provider === "google_calendar") {
    return `Registre no Google Cloud Console (Authorized redirect URIs): ${googleAuthRedirectUri()}`;
  }
  return `Registre no provedor OAuth (Authorized redirect URIs): ${integrationOAuthRedirectUri(provider)}`;
}
