import { localWorkspace } from "@personal-os/db/schema/app";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

export const filesRouter = {
  listWorkspaces: protectedProcedure.handler(async ({ context }) =>
    context.db
      .select()
      .from(localWorkspace)
      .where(eq(localWorkspace.userId, context.session.user.id))
  ),

  registerWorkspace: protectedProcedure
    .input(
      z.object({
        label: z.string().min(1),
        pathFingerprint: z.string().min(1),
      })
    )
    .handler(async ({ context, input }) => {
      const id = crypto.randomUUID();
      await context.db.insert(localWorkspace).values({
        id,
        label: input.label,
        pathFingerprint: input.pathFingerprint,
        userId: context.session.user.id,
      });
      return { id };
    }),
};
