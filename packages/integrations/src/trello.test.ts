import { describe, expect, mock, test } from "bun:test";

import { validateTrelloApiKey } from "./trello";

const INVALID_KEY_MESSAGE = /Trello API key inválida/;

describe("validateTrelloApiKey", () => {
  test("rejects keys Trello reports as invalid", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(
      async () => new Response("invalid key", { status: 401 })
    ) as typeof fetch;

    try {
      await expect(validateTrelloApiKey("bad-key")).rejects.toThrow(
        INVALID_KEY_MESSAGE
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("accepts keys that only fail on the dummy token", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(
      async () => new Response("invalid token", { status: 401 })
    ) as typeof fetch;

    try {
      await expect(validateTrelloApiKey("good-key")).resolves.toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
