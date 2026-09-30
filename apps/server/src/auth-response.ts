import type { FastifyReply } from "fastify";

/**
 * Forward a Better Auth / Fetch `Response` through Fastify.
 *
 * Do not `reply.send(null)` for empty bodies — Fastify JSON-serializes that as
 * the literal `null` and breaks OAuth 302 redirects. Do not rely solely on
 * `reply.send(response)` header iteration for `Set-Cookie` either; use
 * `getSetCookie()` so each cookie is a separate header.
 */
export async function sendAuthResponse(
  reply: FastifyReply,
  response: Response
): Promise<void> {
  reply.status(response.status);

  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      return;
    }
    // Empty redirects often carry application/json from better-call; drop it
    // so browsers treat the 302 as a clean redirect with no content.
    if (
      !response.body &&
      key.toLowerCase() === "content-type" &&
      response.status >= 300 &&
      response.status < 400
    ) {
      return;
    }
    reply.header(key, value);
  });

  for (const cookie of setCookies) {
    reply.header("set-cookie", cookie);
  }

  if (!response.body) {
    await reply.send();
    return;
  }

  await reply.send(await response.text());
}
