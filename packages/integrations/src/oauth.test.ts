import { describe, expect, test } from "bun:test";

import { decryptSecret, encryptSecret } from "./crypto";
import {
  buildAuthorizeUrl,
  createPkcePair,
  decodeOAuthState,
  encodeOAuthState,
  type OAuthEnv,
  type OAuthProvider,
  TRELLO_OAUTH_SCOPES,
} from "./oauth";

const SECRET = "test-better-auth-secret-for-oauth-state";
const ENCRYPTION_KEY = "test-integration-encryption-key-32b!";

describe("crypto", () => {
  test("round-trips secrets", () => {
    const ciphertext = encryptSecret("user-a-token", ENCRYPTION_KEY);
    expect(ciphertext).not.toContain("user-a-token");
    expect(decryptSecret(ciphertext, ENCRYPTION_KEY)).toBe("user-a-token");
  });

  test("rejects tampered payloads", () => {
    const ciphertext = encryptSecret("secret", ENCRYPTION_KEY);
    const [iv, tag, data] = ciphertext.split(".");
    if (!(iv && tag && data)) {
      throw new Error("expected ciphertext parts");
    }
    const flipped = data.endsWith("A")
      ? `${data.slice(0, -1)}B`
      : `${data.slice(0, -1)}A`;
    expect(() =>
      decryptSecret(`${iv}.${tag}.${flipped}`, ENCRYPTION_KEY)
    ).toThrow();
  });
});

describe("oauth state", () => {
  test("binds userId and provider in signed state", () => {
    const state = encodeOAuthState(
      {
        nonce: "n1",
        provider: "gmail",
        returnTo: "/integrations",
        userId: "user-a",
      },
      SECRET
    );
    const payload = decodeOAuthState(state, SECRET);
    expect(payload.userId).toBe("user-a");
    expect(payload.provider).toBe("gmail");
  });

  test("rejects forged state from another secret", () => {
    const state = encodeOAuthState(
      {
        nonce: "n1",
        provider: "notion",
        returnTo: "/integrations",
        userId: "user-a",
      },
      SECRET
    );
    expect(() => decodeOAuthState(state, "other-secret")).toThrow();
  });
});

describe("authorize urls", () => {
  const env: OAuthEnv = {
    appOrigin: "http://localhost:3001",
    encryptionKey: ENCRYPTION_KEY,
    googleClientId: "google-client",
    googleClientSecret: "google-secret",
    notionClientId: "notion-client",
    notionClientSecret: "notion-secret",
    serverOrigin: "http://localhost:3000",
    trelloClientId: "trello-client",
    trelloClientSecret: "trello-secret",
  };

  const providers: OAuthProvider[] = [
    "trello",
    "google_calendar",
    "gmail",
    "notion",
  ];

  test("builds distinct authorize URLs for every provider", () => {
    const { codeChallenge, codeVerifier } = createPkcePair();
    expect(codeVerifier.length).toBeGreaterThan(20);
    expect(codeChallenge.length).toBeGreaterThan(20);

    const urls = Object.fromEntries(
      providers.map((provider) => [
        provider,
        buildAuthorizeUrl(provider, env, "state-token", {
          codeChallenge,
        }),
      ])
    );

    expect(urls.trello).toContain("https://auth.atlassian.com/authorize?");
    expect(urls.trello).toContain("client_id=trello-client");
    expect(urls.trello).toContain("code_challenge_method=S256");
    expect(urls.trello).toContain("read%3Aboard%3Atrello");
    expect(urls.trello).toContain("offline_access");
    expect(TRELLO_OAUTH_SCOPES).toContain("offline_access");
    expect(urls.trello).toContain(
      encodeURIComponent(
        "http://localhost:3000/api/integrations/oauth/trello/callback"
      )
    );
    expect(urls.google_calendar).toContain(
      "https://accounts.google.com/o/oauth2/v2/auth?"
    );
    expect(urls.google_calendar).toContain("calendar.events");
    expect(urls.google_calendar).not.toContain("gmail.readonly");
    expect(urls.gmail).toContain("gmail.readonly");
    expect(urls.gmail).not.toContain("calendar.events");
    expect(urls.notion).toContain("https://api.notion.com/v1/oauth/authorize?");
    expect(urls.gmail).toContain(
      encodeURIComponent(
        "http://localhost:3000/api/integrations/oauth/gmail/callback"
      )
    );
    expect(urls.google_calendar).toContain(
      encodeURIComponent(
        "http://localhost:3000/api/integrations/oauth/google_calendar/callback"
      )
    );
  });
});
