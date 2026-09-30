import {
  appReturnUrl,
  betterAuthGoogleCallbackUrl,
  buildAuthorizeUrl,
  callbackUrl,
  decodeOAuthState,
  encodeOAuthState,
  exchangeGoogleCode,
  exchangeNotionCode,
  normalizeServerOrigin,
  type OAuthProvider,
  type OAuthStatePayload,
  requiredGoogleRedirectUris,
  saveIntegrationToken,
} from "@personal-os/integrations";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";

import { ENV } from "../env.server";
import { auth, db } from "../services";

const PROVIDERS = new Set<OAuthProvider>([
  "trello",
  "google_calendar",
  "gmail",
  "notion",
]);

const REDIRECT_URI_ERROR_RE = /redirect_uri/i;

function serverOrigin(): string {
  try {
    return normalizeServerOrigin(ENV.BETTER_AUTH_URL);
  } catch {
    return "http://localhost:3000";
  }
}

function mismatchHint(provider: OAuthProvider): string {
  if (provider === "google_calendar" || provider === "gmail") {
    const uris = requiredGoogleRedirectUris(serverOrigin());
    const expected =
      provider === "gmail" ? uris.gmailConnect : uris.legacyCalendarConnect;
    return `redirect_uri_mismatch: registre ${expected} (login/Calendar UI: ${uris.googleLoginAndCalendarConnect})`;
  }
  return `redirect_uri_mismatch: registre ${callbackUrl(serverOrigin(), provider)}`;
}

function callbackErrorMessage(provider: OAuthProvider, raw: string): string {
  if (REDIRECT_URI_ERROR_RE.test(raw) || raw === "redirect_uri_mismatch") {
    return mismatchHint(provider);
  }
  return raw;
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

async function persistOAuthTokens(
  provider: OAuthProvider,
  code: string,
  userId: string
): Promise<"ok" | "trello_client"> {
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
    return "ok";
  }

  if (provider === "notion") {
    const tokens = await exchangeNotionCode(code, oauthEnv());
    await saveIntegrationToken(db, {
      accessToken: tokens.accessToken,
      encryptionKey: ENV.INTEGRATION_ENCRYPTION_KEY,
      externalAccountLabel: tokens.workspaceName,
      provider,
      userId,
    });
    return "ok";
  }

  return "trello_client";
}

export function registerOAuthRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/integrations/oauth/:provider/start",
    async (request, reply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session?.user) {
        return reply.redirect(`${ENV.CORS_ORIGIN}/login`);
      }

      const params = request.params as { provider: string };
      const query = request.query as { returnTo?: string };
      const provider = parseProvider(params.provider);
      const returnTo = query.returnTo?.startsWith("/")
        ? query.returnTo
        : "/integrations";

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
        const redirectUri = new URL(url).searchParams.get("redirect_uri");
        request.log.info(
          {
            provider,
            redirectUri,
            betterAuthGoogle: betterAuthGoogleCallbackUrl(serverOrigin()),
          },
          "OAuth authorize redirect"
        );
        return reply.redirect(url);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "OAuth is not configured";
        const withHint =
          provider === "google_calendar" || provider === "gmail"
            ? `${message}. ${mismatchHint(provider)}`
            : message;
        return reply.redirect(
          appReturnUrl(ENV.CORS_ORIGIN, returnTo, { error: withHint })
        );
      }
    }
  );

  fastify.get(
    "/api/integrations/oauth/:provider/callback",
    async (request, reply) => {
      const params = request.params as { provider: string };
      const query = request.query as {
        code?: string;
        error?: string;
        state?: string;
      };
      const provider = parseProvider(params.provider);

      if (query.error || !query.state) {
        return reply.redirect(
          appReturnUrl(ENV.CORS_ORIGIN, "/integrations", {
            error: callbackErrorMessage(
              provider,
              query.error ?? "missing_state"
            ),
          })
        );
      }

      let payload: OAuthStatePayload;
      try {
        payload = decodeOAuthState(query.state, ENV.BETTER_AUTH_SECRET);
      } catch {
        return reply.redirect(
          appReturnUrl(ENV.CORS_ORIGIN, "/integrations", {
            error: "invalid_state",
          })
        );
      }

      if (payload.provider !== provider) {
        return reply.redirect(
          appReturnUrl(ENV.CORS_ORIGIN, "/integrations", {
            error: "provider_mismatch",
          })
        );
      }

      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session?.user || session.user.id !== payload.userId) {
        return reply.redirect(`${ENV.CORS_ORIGIN}/login`);
      }

      if (!query.code) {
        return reply.redirect(
          appReturnUrl(ENV.CORS_ORIGIN, payload.returnTo, {
            error: "missing_code",
          })
        );
      }

      try {
        const result = await persistOAuthTokens(
          provider,
          query.code,
          session.user.id
        );
        if (result === "trello_client") {
          return reply.redirect(
            appReturnUrl(ENV.CORS_ORIGIN, "/oauth/trello", {
              state: query.state,
            })
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "oauth_exchange_failed";
        return reply.redirect(
          appReturnUrl(ENV.CORS_ORIGIN, payload.returnTo, { error: message })
        );
      }

      return reply.redirect(
        appReturnUrl(ENV.CORS_ORIGIN, payload.returnTo, {
          connected: provider,
        })
      );
    }
  );
}
