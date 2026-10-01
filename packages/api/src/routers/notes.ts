import { listKnowledgeNotes } from "@personal-os/capabilities";
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

export const notesRouter = {
  list: protectedProcedure
    .input(z.object({ query: z.string().optional() }).optional())
    .handler(async ({ context, input }) =>
      listKnowledgeNotes(capabilityEnv(context), input?.query ?? "")
    ),
};
