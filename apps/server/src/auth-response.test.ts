import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import Fastify from "fastify";

import { sendAuthResponse } from "./auth-response";

describe("sendAuthResponse", () => {
  const app = Fastify({ logger: false });
  let baseUrl = "";

  beforeAll(async () => {
    app.get("/oauth-redirect", async (_request, reply) => {
      const headers = new Headers();
      headers.append("location", "http://localhost:3001/");
      headers.append(
        "set-cookie",
        "better-auth.session_token=abc; Path=/; HttpOnly; SameSite=Lax"
      );
      headers.append(
        "set-cookie",
        "better-auth.session_data=xyz; Path=/; HttpOnly; SameSite=Lax"
      );
      headers.set("content-type", "application/json");
      const response = new Response(null, { headers, status: 302 });
      await sendAuthResponse(reply, response);
    });

    app.get("/json-ok", async (_request, reply) => {
      const response = new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
      await sendAuthResponse(reply, response);
    });

    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected TCP address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  test("forwards 302 Location and multiple Set-Cookie without JSON null body", async () => {
    const res = await fetch(`${baseUrl}/oauth-redirect`, {
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost:3001/");
    expect(res.headers.get("content-type")).toBeNull();
    expect(res.headers.getSetCookie()).toEqual([
      "better-auth.session_token=abc; Path=/; HttpOnly; SameSite=Lax",
      "better-auth.session_data=xyz; Path=/; HttpOnly; SameSite=Lax",
    ]);
    expect(await res.text()).toBe("");
  });

  test("forwards JSON bodies for non-redirect responses", async () => {
    const res = await fetch(`${baseUrl}/json-ok`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
