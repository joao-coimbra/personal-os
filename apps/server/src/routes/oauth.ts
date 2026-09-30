import {
  buildAuthorizeUrl,
  decodeOAuthState,
  encodeOAuthState,
  exchangeGoogleCode,
  exchangeNotionCode,
  type OAuthProvider,
  type OAuthStatePayload,
  saveIntegrationToken,
} from "@personal-os/integrations";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { ENV } from "../env.server";
import { auth, db } from "../services";

const PROVIDERS = new Set<OAuthProvider>([
  "trello",
  "google_calendar",
  "gmail",
  "notion",
]);

function serverOrigin(): string {
  try {
    return new URL(ENV.BETTER_AUTH_URL).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function oauthEnv() {
  return {
    appOrigin: ENV.CORS_ORIGIN,
    encryptionKey: ENV.INTEGRATION_ENCRYPTION_KEY,
    googleClientId: ENV.GOOGLE_CLIENT_ID,
    googleClientSecret: ENV.GOOGLE_CLIENT_SECRET,
    notionClientId: ENV.NOTION_CLIENT_ID,
    notionClientSecret: ENV.NOTION_CLIENT_SECRET,
    serverOrigin: serverOrigin(),
    trelloApiKey: ENV.TRELLO_API_KEY,
  };
}

function parseProvider(raw: string): OAuthProvider {
  if (!PROVIDERS.has(raw as OAuthProvider)) {
    throw new Error(`Unsupported provider: ${raw}`);
  }
  return raw as OAuthProvider;
}

function redirectError(returnTo: string, message: string): string {
  return `${ENV.CORS_ORIGIN}${returnTo}?error=${encodeURIComponent(message)}`;
}

async function persistOAuthTokens(input: {
  code: string;
  provider: OAuthProvider;
  userId: string;
}): Promise<"trello_fragment" | "saved"> {
  const { code, provider, userId } = input;
  if (provider === "trello") {
    return "trello_fragment";
  }

  if (provider === "google_calendar" || provider === "gmail") {
    const tokens = await exchangeGoogleCode(code, oauthEnv(), provider);
    await saveIntegrationToken(db, {
      accessToken: tokens.accessToken,
      encryptionKey: ENV.INTEGRATION_ENCRYPTION_KEY,
      externalAccountLabel: tokens.email,
      provider,
      refreshToken: tokens.refreshToken,
      scopes: tokens.scopes,
      userId,
    });
    return "saved";
  }

  const tokens = await exchangeNotionCode(code, oauthEnv());
  await saveIntegrationToken(db, {
    accessToken: tokens.accessToken,
    encryptionKey: ENV.INTEGRATION_ENCRYPTION_KEY,
    externalAccountLabel: tokens.workspaceName,
    provider,
    userId,
  });
  return "saved";
}

async function handleOAuthStart(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session?.user) {
    return reply.redirect(`${ENV.CORS_ORIGIN}/login`);
  }

  const params = request.params as { provider: string };
  const query = request.query as { returnTo?: string };
  const returnTo = query.returnTo?.startsWith("/")
    ? query.returnTo
    : "/integrations";

  let provider: OAuthProvider;
  try {
    provider = parseProvider(params.provider);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unsupported provider";
    return reply.redirect(redirectError(returnTo, message));
  }

  const state = encodeOAuthState(
    {
      nonce: crypto.randomUUID(),
      provider,
      returnTo,
      userId: session.user.id,
    },
    ENV.BETTER_AUTH_SECRET
  );

  try {
    const url = buildAuthorizeUrl(provider, oauthEnv(), state, returnTo);
    return reply.redirect(url);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OAuth is not configured";
    return reply.redirect(redirectError(returnTo, message));
  }
}

async function handleOAuthCallback(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = request.params as { provider: string };
  const query = request.query as {
    code?: string;
    error?: string;
    state?: string;
  };

  let provider: OAuthProvider;
  try {
    provider = parseProvider(params.provider);
  } catch {
    return reply.redirect(
      `${ENV.CORS_ORIGIN}/integrations?error=unsupported_provider`
    );
  }

  if (query.error || !query.state) {
    return reply.redirect(
      `${ENV.CORS_ORIGIN}/integrations?error=${encodeURIComponent(query.error ?? "missing_state")}`
    );
  }

  let payload: OAuthStatePayload;
  try {
    payload = decodeOAuthState(query.state, ENV.BETTER_AUTH_SECRET);
  } catch {
    return reply.redirect(
      `${ENV.CORS_ORIGIN}/integrations?error=invalid_state`
    );
  }

  if (payload.provider !== provider) {
    return reply.redirect(
      `${ENV.CORS_ORIGIN}/integrations?error=provider_mismatch`
    );
  }

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session?.user || session.user.id !== payload.userId) {
    return reply.redirect(`${ENV.CORS_ORIGIN}/login`);
  }

  if (!query.code) {
    return reply.redirect(redirectError(payload.returnTo, "missing_code"));
  }

  try {
    const outcome = await persistOAuthTokens({
      code: query.code,
      provider,
      userId: session.user.id,
    });
    if (outcome === "trello_fragment") {
      return reply.redirect(
        `${ENV.CORS_ORIGIN}/oauth/trello?state=${encodeURIComponent(query.state)}`
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "oauth_exchange_failed";
    return reply.redirect(redirectError(payload.returnTo, message));
  }

  return reply.redirect(
    `${ENV.CORS_ORIGIN}${payload.returnTo}?connected=${provider}`
  );
}

export function registerOAuthRoutes(fastify: FastifyInstance) {
  fastify.get("/api/integrations/oauth/:provider/start", handleOAuthStart);
  fastify.get(
    "/api/integrations/oauth/:provider/callback",
    handleOAuthCallback
  );
}
