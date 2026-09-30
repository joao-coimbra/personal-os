import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { getApiUrl, getAppUrl } from "@/lib/server-url";
import { client } from "@/utils/orpc";

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

async function googleConsoleHint(): Promise<string> {
  const expectedUri = googleAuthRedirectUri();
  try {
    const meta = await client.integrations.oauthRedirectUris();
    const fingerprint = meta.googleClientIdFingerprint;
    if (fingerprint) {
      return `Registre ${expectedUri} no OAuth client ${fingerprint} (deve ser o mesmo GOOGLE_CLIENT_ID do apps/server/.env)`;
    }
  } catch {
    // offline / unauthenticated — fall through
  }
  return `Registre no Google Cloud Console: ${expectedUri}`;
}

/**
 * Google Calendar Connect uses Better Auth `linkSocial` so redirect_uri matches
 * login (`/api/auth/callback/google`). Custom `/api/integrations/oauth/google_calendar/*`
 * start is blocked server-side — it would send a Console-unregistered redirect_uri.
 */
async function connectGoogleCalendar(returnTo: string): Promise<void> {
  const expectedUri = googleAuthRedirectUri();
  const callbackURL = getAppUrl(
    withQueryParam(returnTo, "connected", "google_calendar")
  );
  const errorCallbackURL = getAppUrl(returnTo);

  const result = await authClient.linkSocial({
    callbackURL,
    disableRedirect: true,
    errorCallbackURL,
    provider: "google",
    scopes: [...GOOGLE_CALENDAR_SCOPES],
  });

  if (result.error) {
    const message = result.error.message || "Falha ao conectar Google Calendar";
    if (OAUTH_CONSOLE_HINT_RE.test(message)) {
      toast.error(`${message} ${await googleConsoleHint()}`, {
        duration: 20_000,
      });
      return;
    }
    toast.error(message);
    return;
  }

  const authorizeUrl = result.data?.url;
  if (!authorizeUrl) {
    toast.error("Falha ao iniciar OAuth do Google Calendar");
    return;
  }

  let actualRedirectUri: string | null = null;
  try {
    actualRedirectUri = new URL(authorizeUrl).searchParams.get("redirect_uri");
  } catch {
    toast.error("URL de autorização Google inválida");
    return;
  }

  if (actualRedirectUri !== expectedUri) {
    toast.error(
      `redirect_uri inesperado: ${actualRedirectUri ?? "(vazio)"}. Esperado: ${expectedUri}. ${await googleConsoleHint()}`,
      { duration: 25_000 }
    );
    return;
  }

  window.location.assign(authorizeUrl);
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
