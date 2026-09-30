import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type OAuthProvider = "trello" | "google_calendar" | "gmail" | "notion";

export interface OAuthEnv {
  appOrigin: string;
  encryptionKey: string;
  googleClientId?: string;
  googleClientSecret?: string;
  notionClientId?: string;
  notionClientSecret?: string;
  serverOrigin: string;
  /** Atlassian OAuth 2.0 client id (Developer Console). */
  trelloClientId?: string;
  /** Atlassian OAuth 2.0 client secret (confidential clients). */
  trelloClientSecret?: string;
}

export interface OAuthStatePayload {
  /** PKCE verifier for Atlassian/Trello OAuth 2.0. */
  codeVerifier?: string;
  /** `popup` → `/oauth/popup-done`; `page` (default) → `returnTo`. */
  displayMode?: "popup" | "page";
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

/**
 * Must match scopes enabled on the Atlassian OAuth 2.0 client.
 * `offline_access` is required to receive a refresh token.
 * `read:member:trello` is required for `/members/me` (account label + board listing).
 */
export const TRELLO_OAUTH_SCOPES = [
  "read:member:trello",
  "read:board:trello",
  "write:board:trello",
  "write:board:membership:trello",
  "read:organization:trello",
  "offline_access",
].join(" ");

const GOOGLE_PROVIDERS = new Set<OAuthProvider>(["google_calendar", "gmail"]);

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

function googleScopesFor(provider: OAuthProvider): string {
  if (provider === "gmail") {
    return GMAIL_SCOPES;
  }
  return GOOGLE_CALENDAR_SCOPES;
}

/** Creates a PKCE verifier/challenge pair (S256) for Atlassian OAuth 2.0. */
export function createPkcePair(): {
  codeChallenge: string;
  codeVerifier: string;
} {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeChallenge, codeVerifier };
}

export function buildAuthorizeUrl(
  provider: OAuthProvider,
  env: OAuthEnv,
  state: string,
  options?: { codeChallenge?: string }
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

  // Atlassian OAuth 2.0 (confidential + PKCE) for Trello.
  if (!env.trelloClientId) {
    throw new Error("TRELLO_API_KEY (OAuth client id) is not configured.");
  }
  if (!options?.codeChallenge) {
    throw new Error("Trello OAuth requires a PKCE code challenge.");
  }
  const params = new URLSearchParams({
    client_id: env.trelloClientId,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
    redirect_uri: callbackUrl(env.serverOrigin, "trello"),
    response_type: "code",
    scope: TRELLO_OAUTH_SCOPES,
    state,
  });
  return `https://auth.atlassian.com/authorize?${params.toString()}`;
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

export async function exchangeTrelloCode(
  code: string,
  codeVerifier: string,
  env: OAuthEnv
): Promise<{
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
  scopes?: string;
}> {
  if (!(env.trelloClientId && env.trelloClientSecret)) {
    throw new Error(
      "Trello OAuth credentials are not configured (TRELLO_API_KEY + TRELLO_API_SECRET)."
    );
  }
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    body: JSON.stringify({
      client_id: env.trelloClientId,
      client_secret: env.trelloClientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl(env.serverOrigin, "trello"),
    }),
    headers: { "Content-Type": "application/json; charset=utf-8" },
    method: "POST",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Trello token exchange failed: ${response.status}${detail ? ` ${detail}` : ""}`
    );
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
    scopes: data.scope,
  };
}

export async function refreshTrelloAccessToken(
  refreshToken: string,
  env: OAuthEnv
): Promise<{
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
  scopes?: string;
}> {
  if (!(env.trelloClientId && env.trelloClientSecret)) {
    throw new Error(
      "Trello OAuth credentials are not configured (TRELLO_API_KEY + TRELLO_API_SECRET)."
    );
  }
  const response = await fetch("https://auth.atlassian.com/oauth/token", {
    body: JSON.stringify({
      client_id: env.trelloClientId,
      client_secret: env.trelloClientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers: { "Content-Type": "application/json; charset=utf-8" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Trello token refresh failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
    scopes: data.scope,
  };
}

export async function fetchTrelloMemberLabel(
  accessToken: string
): Promise<string> {
  const response = await fetch(
    "https://api.trello.com/1/members/me?fields=fullName,username",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    throw new Error(
      `Trello access token was issued but the Trello API rejected it (${response.status}${detail ? `: ${detail}` : ""}). Confirm the OAuth 2.0 app is from trello.com/power-ups/admin (or apps/admin), has the Trello scopes enabled (including read:member:trello), then reconnect.`
    );
  }
  const data = (await response.json()) as {
    fullName?: string;
    username?: string;
  };
  const label = data.fullName ?? data.username;
  if (!label) {
    throw new Error(
      "Trello API responded but returned no member label. Reconnect Trello."
    );
  }
  return label;
}
