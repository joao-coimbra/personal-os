import { integrationConnection } from "@personal-os/db/schema/app";
import {
  clearIntegrationConnection,
  saveIntegrationToken,
} from "@personal-os/integrations";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const providerSchema = z.enum(["trello", "google_calendar", "gmail", "notion"]);

export const integrationsRouter = {
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
      await clearIntegrationConnection(
        context.db,
        context.session.user.id,
        input.provider
      );
      return { success: true };
    }),
  getAuthorizeUrl: protectedProcedure
    .input(
      z.object({
        provider: providerSchema,
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
