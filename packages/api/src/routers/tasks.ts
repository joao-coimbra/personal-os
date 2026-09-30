import { classifyTasks, listTasks } from "@personal-os/capabilities";
import { z } from "zod";

import { protectedProcedure } from "../index";

function capabilityEnv(context: {
  db: import("@personal-os/db").Database;
  session: { user: { id: string } };
}) {
  return {
    db: context.db,
    encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY ?? "",
    trelloApiKey: process.env.TRELLO_API_KEY,
    trelloApiSecret: process.env.TRELLO_API_SECRET,
    userId: context.session.user.id,
  };
}

export const tasksRouter = {
  classify: protectedProcedure.handler(async ({ context }) =>
    classifyTasks(capabilityEnv(context))
  ),

  list: protectedProcedure
    .input(z.object({ boardId: z.string().optional() }).optional())
    .handler(async ({ context, input }) =>
      listTasks(capabilityEnv(context), input?.boardId)
    ),
};
