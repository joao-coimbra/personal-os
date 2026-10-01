import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { extractText, getDocumentProxy } from "unpdf";

import { auth } from "../services";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

export async function registerFileRoutes(fastify: FastifyInstance) {
  fastify.post("/api/files/extract-pdf", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session?.user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "Missing file" });
    }
    const buffer = await data.toBuffer();
    if (buffer.byteLength > MAX_PDF_BYTES) {
      return reply.status(413).send({ error: "File too large" });
    }
    if (data.mimetype !== "application/pdf") {
      return reply.status(400).send({ error: "Expected application/pdf" });
    }

    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return { text: text.slice(0, 30_000) };
  });
}
