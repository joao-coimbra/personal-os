import {
  classifyTasks,
  listTaskLists,
  listTasks,
  moveTask,
} from "@personal-os/capabilities";
import { z } from "zod";

import { protectedProcedure } from "../index";

function capabilityEnv(context: {
  db: import("@personal-os/db").Database;
  session: { user: { id: string } };
}) {
  return {
    db: context.db,
    encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY ?? "",
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    trelloApiKey: process.env.TRELLO_API_KEY,
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

  lists: protectedProcedure
    .input(z.object({ boardId: z.string().optional() }).optional())
    .handler(async ({ context, input }) =>
      listTaskLists(capabilityEnv(context), input?.boardId)
    ),

  move: protectedProcedure
    .input(z.object({ cardId: z.string().min(1), idList: z.string().min(1) }))
    .handler(async ({ context, input }) =>
      moveTask(capabilityEnv(context), input)
    ),
};
