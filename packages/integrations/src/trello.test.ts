import { describe, expect, mock, test } from "bun:test";

import { isClassicTrelloApiKey, validateTrelloApiKey } from "./trello";

const INVALID_KEY_MESSAGE = /Trello API key inválida|classic Power-Up API Key/;
const CLASSIC_KEY_MESSAGE = /classic Power-Up API Key/;

describe("isClassicTrelloApiKey", () => {
  test("accepts 32 hex chars", () => {
    expect(isClassicTrelloApiKey("0123456789abcdef0123456789abcdef")).toBe(
      true
    );
  });

  test("rejects Atlassian OAuth client ids", () => {
    expect(isClassicTrelloApiKey("mmzDClientIdNotHex01234567890123")).toBe(
      false
    );
  });
});

describe("validateTrelloApiKey", () => {
  test("rejects non-classic keys before calling Trello", async () => {
    await expect(validateTrelloApiKey("oauth-client-id")).rejects.toThrow(
      CLASSIC_KEY_MESSAGE
    );
  });

  test("rejects keys Trello reports as invalid", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(
      async () => new Response("invalid key", { status: 401 })
    ) as typeof fetch;

    try {
      await expect(
        validateTrelloApiKey("0123456789abcdef0123456789abcdef")
      ).rejects.toThrow(INVALID_KEY_MESSAGE);
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
      await expect(
        validateTrelloApiKey("0123456789abcdef0123456789abcdef")
      ).resolves.toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
