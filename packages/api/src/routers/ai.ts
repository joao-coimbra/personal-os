import { createFocusBlocks } from "@personal-os/capabilities";
import { pendingAiAction } from "@personal-os/db/schema/app";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const focusBlockSchema = z.object({
  end: z.string(),
  start: z.string(),
  summary: z.string(),
});

export const aiRouter = {
  cancelPending: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await context.db
        .update(pendingAiAction)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(pendingAiAction.id, input.id),
            eq(pendingAiAction.userId, context.session.user.id),
            eq(pendingAiAction.status, "pending")
          )
        );
      return { success: true };
    }),

  confirmAction: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
      if (!encryptionKey || encryptionKey.length < 32) {
        throw new Error("INTEGRATION_ENCRYPTION_KEY is not configured.");
      }

      const rows = await context.db
        .select()
        .from(pendingAiAction)
        .where(
          and(
            eq(pendingAiAction.id, input.id),
            eq(pendingAiAction.userId, context.session.user.id),
            eq(pendingAiAction.status, "pending")
          )
        )
        .limit(1);
      const action = rows[0];
      if (!action) {
        throw new Error("Pending action not found or already handled.");
      }
      if (action.expiresAt < new Date()) {
        await context.db
          .update(pendingAiAction)
          .set({ status: "expired" })
          .where(eq(pendingAiAction.id, action.id));
        throw new Error("Pending action expired.");
      }

      if (action.kind === "create_focus_blocks") {
        const payload = action.payload as {
          blocks?: z.infer<typeof focusBlockSchema>[];
        };
        const blocks = payload.blocks ?? [];
        const created = await createFocusBlocks(
          {
            db: context.db,
            encryptionKey,
            trelloApiKey: process.env.TRELLO_API_KEY,
            userId: context.session.user.id,
          },
          blocks
        );
        await context.db
          .update(pendingAiAction)
          .set({ status: "confirmed" })
          .where(eq(pendingAiAction.id, action.id));
        return { created, kind: action.kind, success: true };
      }

      throw new Error(`Unsupported pending action kind: ${action.kind}`);
    }),

  listPending: protectedProcedure.handler(async ({ context }) =>
    context.db
      .select({
        createdAt: pendingAiAction.createdAt,
        expiresAt: pendingAiAction.expiresAt,
        id: pendingAiAction.id,
        kind: pendingAiAction.kind,
        payload: pendingAiAction.payload,
      })
      .from(pendingAiAction)
      .where(
        and(
          eq(pendingAiAction.userId, context.session.user.id),
          eq(pendingAiAction.status, "pending")
        )
      )
  ),
};
