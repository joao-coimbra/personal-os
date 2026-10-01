import { userPreference } from "@personal-os/db/schema/app";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const preferenceSchema = z.object({
  breakMinutes: z.number().int().min(5).max(60),
  focusMinutes: z.number().int().min(15).max(180),
  timezone: z.string(),
  workEnd: z.string(),
  workStart: z.string(),
});

const preferredAiSchema = z.enum(["anthropic", "openai"]);

export const preferencesRouter = {
  completeOnboarding: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    const existing = await context.db
      .select()
      .from(userPreference)
      .where(eq(userPreference.userId, userId))
      .limit(1);
    if (existing[0]) {
      await context.db
        .update(userPreference)
        .set({ onboardingCompletedAt: new Date() })
        .where(eq(userPreference.userId, userId));
      return { success: true };
    }
    await context.db.insert(userPreference).values({
      id: crypto.randomUUID(),
      onboardingCompletedAt: new Date(),
      userId,
    });
    return { success: true };
  }),

  get: protectedProcedure.handler(async ({ context }) => {
    const rows = await context.db
      .select()
      .from(userPreference)
      .where(eq(userPreference.userId, context.session.user.id))
      .limit(1);
    return rows[0] ?? null;
  }),

  setPreferredAiProvider: protectedProcedure
    .input(z.object({ preferredAiProvider: preferredAiSchema.nullable() }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const rows = await context.db
        .select()
        .from(userPreference)
        .where(eq(userPreference.userId, userId))
        .limit(1);
      if (rows[0]) {
        await context.db
          .update(userPreference)
          .set({
            preferredAiProvider: input.preferredAiProvider,
            updatedAt: new Date(),
          })
          .where(eq(userPreference.userId, userId));
        return { success: true };
      }
      await context.db.insert(userPreference).values({
        id: crypto.randomUUID(),
        preferredAiProvider: input.preferredAiProvider,
        userId,
      });
      return { success: true };
    }),

  upsert: protectedProcedure
    .input(preferenceSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const rows = await context.db
        .select()
        .from(userPreference)
        .where(eq(userPreference.userId, userId))
        .limit(1);
      if (rows[0]) {
        await context.db
          .update(userPreference)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(userPreference.userId, userId));
        return { success: true };
      }
      await context.db.insert(userPreference).values({
        id: crypto.randomUUID(),
        userId,
        ...input,
      });
      return { success: true };
    }),
};
