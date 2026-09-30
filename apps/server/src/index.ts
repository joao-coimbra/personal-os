import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import { OpenAPIHandler } from "@orpc/openapi/fastify";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fastify";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { appRouter } from "@personal-os/api/routers/index";
import { createUIMessageStreamResponse, toUIMessageStream } from "ai";
import { fromNodeHeaders } from "better-auth/node";
import Fastify from "fastify";

import { type AiRequestBody, createOperatorStream } from "./ai/handler";
import { sendAuthResponse } from "./auth-response";
import { createContext } from "./context";
import { desktopOrigins, ENV } from "./env.server";
import { registerMcpRoutes } from "./mcp/register";
import { registerFileRoutes } from "./routes/files";
import { registerOAuthRoutes } from "./routes/oauth";
import { auth, db } from "./services";

const localDevOrigins =
  ENV.NODE_ENV === "development"
    ? [
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ]
    : [];

const baseCorsConfig = {
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86_400,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  origin: [
    ...new Set([ENV.CORS_ORIGIN, ...localDevOrigins, ...desktopOrigins]),
  ],
};

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

const apiHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
});

const fastify = Fastify({
  logger: true,
});

fastify.register(fastifyCors, baseCorsConfig);
fastify.register(fastifyMultipart, { limits: { fileSize: 8 * 1024 * 1024 } });
void registerFileRoutes(fastify);
void registerMcpRoutes(fastify);
void registerOAuthRoutes(fastify);

fastify.register(async (rpcApp) => {
  // Fully utilize oRPC features by letting oRPC parse the request body.
  rpcApp.addContentTypeParser("*", (_, _payload, done) => {
    done(null, undefined);
  });

  rpcApp.all("/api/rpc/*", async (request, reply) => {
    const { matched } = await rpcHandler.handle(request, reply, {
      context: await createContext(request.headers),
      prefix: "/api/rpc",
    });

    if (!matched) {
      reply.status(404).send();
    }
  });

  rpcApp.all("/api/api-reference/*", async (request, reply) => {
    const { matched } = await apiHandler.handle(request, reply, {
      context: await createContext(request.headers),
      prefix: "/api/api-reference",
    });

    if (!matched) {
      reply.status(404).send();
    }
  });
});

fastify.route({
  async handler(request, reply) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = fromNodeHeaders(request.headers);
      const req = new Request(url.toString(), {
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        headers,
        method: request.method,
      });
      const response = await auth.handler(req);
      // Forward status / Location / Set-Cookie without JSON-serializing empty
      // redirect bodies as `null` (breaks Google OAuth callbacks in the browser).
      await sendAuthResponse(reply, response);
    } catch (error) {
      fastify.log.error({ err: error }, "Authentication Error:");
      return reply.status(500).send({
        code: "AUTH_FAILURE",
        error: "Internal authentication error",
      });
    }
  },
  method: ["GET", "POST"],
  url: "/api/auth/*",
});

fastify.post("/api/ai", async (request, reply) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session?.user) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const body = request.body as AiRequestBody;
  const result = await createOperatorStream(
    {
      db,
      encryptionKey: ENV.INTEGRATION_ENCRYPTION_KEY,
      trelloApiKey: ENV.TRELLO_API_KEY,
      userId: session.user.id,
    },
    body
  );

  const response = createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
  reply.status(response.status);
  response.headers.forEach((value, key) => {
    reply.header(key, value);
  });
  return reply.send(response.body);
});

fastify.get("/", async () => "OK");

fastify.listen({ host: "0.0.0.0", port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log("Server running on port 3000");
});
