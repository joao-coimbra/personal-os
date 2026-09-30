import { createHmac, timingSafeEqual } from "node:crypto";

export type OAuthProvider = "trello" | "google_calendar" | "gmail" | "notion";

export interface OAuthEnv {
  appOrigin: string;
  encryptionKey: string;
  googleClientId?: string;
  googleClientSecret?: string;
  notionClientId?: string;
  notionClientSecret?: string;
  serverOrigin: string;
  trelloApiKey?: string;
}

export interface OAuthStatePayload {
  nonce: string;
  provider: OAuthProvider;
  returnTo: string;
  userId: string;
}

/** Calendar events only — same scopes used when Google login syncs calendar. */
const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

/**
 * Gmail readonly for triage/organization intents.
 * gmail.readonly covers message + label reads without send/delete.
 * Label apply / modify deferred until explicit confirmation UX exists.
 */
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const GOOGLE_PROVIDERS = new Set<OAuthProvider>(["google_calendar", "gmail"]);

/** Classic Trello Power-Up API key (32 hex). Atlassian OAuth client ids are rejected. */
const TRELLO_POWERUP_API_KEY_RE = /^[0-9a-f]{32}$/i;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeOAuthState(
  payload: OAuthStatePayload,
  secret: string
): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  return `${body}.${sign(body, secret)}`;
}

export function decodeOAuthState(
  state: string,
  secret: string
): OAuthStatePayload {
  const [body, signature] = state.split(".");
  if (!(body && signature)) {
    throw new Error("Invalid OAuth state.");
  }
  const expected = sign(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid OAuth state signature.");
  }
  return JSON.parse(
    Buffer.from(body, "base64url").toString("utf8")
  ) as OAuthStatePayload;
}

export function callbackUrl(
  serverOrigin: string,
  provider: OAuthProvider
): string {
  return `${serverOrigin}/api/integrations/oauth/${provider}/callback`;
}

/**
 * Build an absolute redirect back into the web app, merging query params onto a
 * relative returnTo that may already include `?step=…`.
 */
export function appReturnUrl(
  appOrigin: string,
  returnTo: string,
  params: Record<string, string> = {}
): string {
  const origin = new URL(appOrigin);
  const safePath =
    returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/integrations";
  const url = new URL(safePath, origin);
  if (url.origin !== origin.origin) {
    return new URL("/integrations", origin).href;
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

function googleScopesFor(provider: OAuthProvider): string {
  if (provider === "gmail") {
    return GMAIL_SCOPES;
  }
  return GOOGLE_CALENDAR_SCOPES;
}

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  env: OAuthEnv,
  state: string,
  returnTo = "/integrations"
): string {
  if (GOOGLE_PROVIDERS.has(provider)) {
    if (!env.googleClientId) {
      throw new Error("GOOGLE_CLIENT_ID is not configured.");
    }
    const params = new URLSearchParams({
      access_type: "offline",
      client_id: env.googleClientId,
      include_granted_scopes: "true",
      prompt: "consent",
      redirect_uri: callbackUrl(env.serverOrigin, provider),
      response_type: "code",
      scope: googleScopesFor(provider),
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (provider === "notion") {
    if (!env.notionClientId) {
      throw new Error("NOTION_CLIENT_ID is not configured.");
    }
    const params = new URLSearchParams({
      client_id: env.notionClientId,
      owner: "user",
      redirect_uri: callbackUrl(env.serverOrigin, provider),
      response_type: "code",
      state,
    });
    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  // Classic Trello Auth (/1/authorize) requires the Power-Up API key (32 hex).
  // Atlassian OAuth client IDs (e.g. mixed alphanumeric / ATOA secrets) produce
  // "App not found" on trello.com and must not be used here.
  if (!env.trelloApiKey) {
    throw new Error("TRELLO_API_KEY is not configured.");
  }
  if (!TRELLO_POWERUP_API_KEY_RE.test(env.trelloApiKey)) {
    throw new Error(
      "TRELLO_API_KEY must be the classic 32-character hex Power-Up API key from https://trello.com/power-ups/admin (not an Atlassian OAuth client id)."
    );
  }
  const returnUrl = `${env.appOrigin}/oauth/trello?state=${encodeURIComponent(state)}&returnTo=${encodeURIComponent(returnTo)}`;
  const params = new URLSearchParams({
    callback_method: "fragment",
    expiration: "never",
    key: env.trelloApiKey,
    name: "PersonalOS",
    response_type: "token",
    return_url: returnUrl,
    scope: "read,write,account",
  });
  return `https://trello.com/1/authorize?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  env: OAuthEnv,
  provider: "google_calendar" | "gmail" = "google_calendar"
): Promise<{
  accessToken: string;
  refreshToken?: string;
  scopes?: string;
  email?: string;
}> {
  if (!(env.googleClientId && env.googleClientSecret)) {
    throw new Error("Google OAuth credentials are not configured.");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(env.serverOrigin, provider),
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
  };

  let email: string | undefined;
  try {
    const profile = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${data.access_token}` } }
    );
    if (profile.ok) {
      const json = (await profile.json()) as { email?: string };
      ({ email } = json);
    }
  } catch {
    // optional label
  }

  return {
    accessToken: data.access_token,
    email,
    refreshToken: data.refresh_token,
    scopes: data.scope,
  };
}

export async function exchangeNotionCode(
  code: string,
  env: OAuthEnv
): Promise<{
  accessToken: string;
  workspaceName?: string;
}> {
  if (!(env.notionClientId && env.notionClientSecret)) {
    throw new Error("Notion OAuth credentials are not configured.");
  }
  const basic = Buffer.from(
    `${env.notionClientId}:${env.notionClientSecret}`
  ).toString("base64");
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    body: JSON.stringify({
      code,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(env.serverOrigin, "notion"),
    }),
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Notion token exchange failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    workspace_name?: string;
  };
  return {
    accessToken: data.access_token,
    workspaceName: data.workspace_name,
  };
}

export async function fetchTrelloMemberLabel(
  token: string,
  apiKey: string
): Promise<string | undefined> {
  const url = new URL("https://api.trello.com/1/members/me");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", token);
  const response = await fetch(url);
  if (!response.ok) {
    return;
  }
  const data = (await response.json()) as {
    fullName?: string;
    username?: string;
  };
  return data.fullName ?? data.username;
}
