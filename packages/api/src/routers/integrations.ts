import { integrationConnection } from "@personal-os/db/schema/app";
import { saveIntegrationToken } from "@personal-os/integrations";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const oauthProviderSchema = z.enum([
  "trello",
  "google_calendar",
  "gmail",
  "notion",
]);

const apiKeyProviderSchema = z.enum(["anthropic", "openai"]);

const providerSchema = z.enum([
  "trello",
  "google_calendar",
  "gmail",
  "notion",
  "anthropic",
  "openai",
]);

async function pingAnthropic(apiKey: string): Promise<void> {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("API key Anthropic inválida ou sem acesso.");
  }
}

async function pingOpenAi(apiKey: string): Promise<void> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("API key OpenAI inválida ou sem acesso.");
  }
}

export const integrationsRouter = {
  connectApiKey: protectedProcedure
    .input(
      z.object({
        apiKey: z.string().min(8).max(512),
        provider: apiKeyProviderSchema,
      })
    )
    .handler(async ({ context, input }) => {
      const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
      if (!encryptionKey || encryptionKey.length < 32) {
        throw new Error("INTEGRATION_ENCRYPTION_KEY is not configured.");
      }

      const key = input.apiKey.trim();
      if (input.provider === "anthropic") {
        if (!key.startsWith("sk-ant-")) {
          throw new Error("API key Anthropic deve começar com sk-ant-.");
        }
        await pingAnthropic(key);
      } else {
        if (!key.startsWith("sk-")) {
          throw new Error("API key OpenAI deve começar com sk-.");
        }
        await pingOpenAi(key);
      }

      await saveIntegrationToken(context.db, {
        accessToken: key,
        encryptionKey,
        externalAccountLabel:
          input.provider === "anthropic" ? "Claude API" : "OpenAI API",
        provider: input.provider,
        userId: context.session.user.id,
      });
      return { success: true };
    }),

  connectToken: protectedProcedure
    .input(
      z.object({
        externalAccountLabel: z.string().optional(),
        provider: providerSchema,
        token: z.string().min(1),
      })
    )
    .handler(async ({ context, input }) => {
      const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
      if (!encryptionKey || encryptionKey.length < 32) {
        throw new Error("INTEGRATION_ENCRYPTION_KEY is not configured.");
      }
      await saveIntegrationToken(context.db, {
        accessToken: input.token,
        encryptionKey,
        externalAccountLabel: input.externalAccountLabel,
        provider: input.provider,
        userId: context.session.user.id,
      });
      return { success: true };
    }),

  disconnect: protectedProcedure
    .input(z.object({ provider: providerSchema }))
    .handler(async ({ context, input }) => {
      await context.db
        .update(integrationConnection)
        .set({
          accessTokenEncrypted: null,
          status: "disconnected",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(integrationConnection.userId, context.session.user.id),
            eq(integrationConnection.provider, input.provider)
          )
        );
      return { success: true };
    }),

  getAuthorizeUrl: protectedProcedure
    .input(
      z.object({
        provider: oauthProviderSchema,
        returnTo: z.string().optional(),
      })
    )
    .handler(({ input }) => {
      const returnTo = input.returnTo?.startsWith("/")
        ? input.returnTo
        : "/integrations";
      const base = process.env.BETTER_AUTH_URL
        ? new URL(process.env.BETTER_AUTH_URL).origin
        : "http://localhost:3000";
      return {
        url: `${base}/api/integrations/oauth/${input.provider}/start?returnTo=${encodeURIComponent(returnTo)}`,
      };
    }),

  list: protectedProcedure.handler(async ({ context }) =>
    context.db
      .select({
        errorCode: integrationConnection.errorCode,
        externalAccountLabel: integrationConnection.externalAccountLabel,
        lastSyncAt: integrationConnection.lastSyncAt,
        provider: integrationConnection.provider,
        status: integrationConnection.status,
      })
      .from(integrationConnection)
      .where(eq(integrationConnection.userId, context.session.user.id))
  ),
};
