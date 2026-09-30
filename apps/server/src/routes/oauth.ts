import {
  buildAuthorizeUrl,
  decodeOAuthState,
  encodeOAuthState,
  exchangeGoogleCode,
  exchangeNotionCode,
  type OAuthProvider,
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

export async function registerOAuthRoutes(fastify: FastifyInstance) {
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
        return reply.redirect(url);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "OAuth is not configured";
        return reply.redirect(
          `${ENV.CORS_ORIGIN}${returnTo}?error=${encodeURIComponent(message)}`
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
          `${ENV.CORS_ORIGIN}/integrations?error=${encodeURIComponent(query.error ?? "missing_state")}`
        );
      }

      let payload;
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
        return reply.redirect(
          `${ENV.CORS_ORIGIN}${payload.returnTo}?error=missing_code`
        );
      }

      try {
        if (provider === "google_calendar" || provider === "gmail") {
          const tokens = await exchangeGoogleCode(
            query.code,
            oauthEnv(),
            provider
          );
          await saveIntegrationToken(db, {
            accessToken: tokens.accessToken,
            encryptionKey: ENV.INTEGRATION_ENCRYPTION_KEY,
            externalAccountLabel: tokens.email,
            provider,
            refreshToken: tokens.refreshToken,
            scopes: tokens.scopes,
            userId: session.user.id,
          });
        } else if (provider === "notion") {
          const tokens = await exchangeNotionCode(query.code, oauthEnv());
          await saveIntegrationToken(db, {
            accessToken: tokens.accessToken,
            encryptionKey: ENV.INTEGRATION_ENCRYPTION_KEY,
            externalAccountLabel: tokens.workspaceName,
            provider,
            userId: session.user.id,
          });
        } else {
          return reply.redirect(
            `${ENV.CORS_ORIGIN}/oauth/trello?state=${encodeURIComponent(query.state)}`
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "oauth_exchange_failed";
        return reply.redirect(
          `${ENV.CORS_ORIGIN}${payload.returnTo}?error=${encodeURIComponent(message)}`
        );
      }

      return reply.redirect(
        `${ENV.CORS_ORIGIN}${payload.returnTo}?connected=${provider}`
      );
    }
  );
}
