import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createDb } from "@personal-os/db";
import { integrationConnection } from "@personal-os/db/schema/app";
import { user } from "@personal-os/db/schema/auth";
import { and, eq } from "drizzle-orm";

import {
  clearIntegrationConnection,
  getIntegrationToken,
  saveIntegrationToken,
} from "./tokens";

const ENCRYPTION_KEY =
  process.env.INTEGRATION_ENCRYPTION_KEY ??
  "test-integration-encryption-key-32b!";

const USER_A = "integration-test-user-a";
const USER_B = "integration-test-user-b";

const PROVIDERS = ["trello", "google_calendar", "gmail", "notion"] as const;

describe("per-user integration isolation", () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    test.skip("DATABASE_URL required", () => undefined);
    return;
  }

  const db = createDb({ DATABASE_URL: databaseUrl });

  beforeAll(async () => {
    await Promise.all(
      [USER_A, USER_B].map((id) =>
        db
          .insert(user)
          .values({
            email: `${id}@example.test`,
            id,
            name: id,
          })
          .onConflictDoNothing()
      )
    );
  });

  afterAll(async () => {
    await Promise.all([
      db
        .delete(integrationConnection)
        .where(eq(integrationConnection.userId, USER_A)),
      db
        .delete(integrationConnection)
        .where(eq(integrationConnection.userId, USER_B)),
    ]);
    await Promise.all([
      db.delete(user).where(eq(user.id, USER_A)),
      db.delete(user).where(eq(user.id, USER_B)),
    ]);
  });

  test("tokens stay scoped to each user for every provider", async () => {
    await Promise.all(
      PROVIDERS.flatMap((provider) => [
        saveIntegrationToken(db, {
          accessToken: `token-a-${provider}`,
          encryptionKey: ENCRYPTION_KEY,
          externalAccountLabel: `a-${provider}`,
          provider,
          refreshToken: `refresh-a-${provider}`,
          scopes: "read",
          userId: USER_A,
        }),
        saveIntegrationToken(db, {
          accessToken: `token-b-${provider}`,
          encryptionKey: ENCRYPTION_KEY,
          externalAccountLabel: `b-${provider}`,
          provider,
          refreshToken: `refresh-b-${provider}`,
          scopes: "read",
          userId: USER_B,
        }),
      ])
    );

    const tokens = await Promise.all(
      PROVIDERS.flatMap((provider) => [
        getIntegrationToken(db, USER_A, provider, ENCRYPTION_KEY),
        getIntegrationToken(db, USER_B, provider, ENCRYPTION_KEY),
      ])
    );

    for (const [index, provider] of PROVIDERS.entries()) {
      expect(tokens[index * 2]).toBe(`token-a-${provider}`);
      expect(tokens[index * 2 + 1]).toBe(`token-b-${provider}`);
    }
  });

  test("disconnect clears secrets for one user without touching the other", async () => {
    await clearIntegrationConnection(db, USER_A, "notion");

    expect(
      await getIntegrationToken(db, USER_A, "notion", ENCRYPTION_KEY)
    ).toBeNull();
    expect(
      await getIntegrationToken(db, USER_B, "notion", ENCRYPTION_KEY)
    ).toBe("token-b-notion");

    const rows = await db
      .select()
      .from(integrationConnection)
      .where(
        and(
          eq(integrationConnection.userId, USER_A),
          eq(integrationConnection.provider, "notion")
        )
      )
      .limit(1);
    const [row] = rows;
    expect(row?.status).toBe("disconnected");
    expect(row?.accessTokenEncrypted).toBeNull();
    expect(row?.refreshTokenEncrypted).toBeNull();
    expect(row?.scopes).toBeNull();
    expect(row?.externalAccountLabel).toBeNull();
  });

  test("re-saving access token without refresh preserves existing refresh", async () => {
    await saveIntegrationToken(db, {
      accessToken: "token-a-gmail-v1",
      encryptionKey: ENCRYPTION_KEY,
      provider: "gmail",
      refreshToken: "refresh-keep-me",
      userId: USER_A,
    });
    await saveIntegrationToken(db, {
      accessToken: "token-a-gmail-v2",
      encryptionKey: ENCRYPTION_KEY,
      provider: "gmail",
      userId: USER_A,
    });

    const rows = await db
      .select()
      .from(integrationConnection)
      .where(
        and(
          eq(integrationConnection.userId, USER_A),
          eq(integrationConnection.provider, "gmail")
        )
      )
      .limit(1);
    const [gmailRow] = rows;
    expect(gmailRow?.refreshTokenEncrypted).toBeTruthy();
    expect(await getIntegrationToken(db, USER_A, "gmail", ENCRYPTION_KEY)).toBe(
      "token-a-gmail-v2"
    );
  });

  test("unique (userId, provider) prevents duplicate connected rows", async () => {
    await saveIntegrationToken(db, {
      accessToken: "dup-1",
      encryptionKey: ENCRYPTION_KEY,
      provider: "trello",
      userId: USER_A,
    });
    await saveIntegrationToken(db, {
      accessToken: "dup-2",
      encryptionKey: ENCRYPTION_KEY,
      provider: "trello",
      userId: USER_A,
    });

    const rows = await db
      .select()
      .from(integrationConnection)
      .where(
        and(
          eq(integrationConnection.userId, USER_A),
          eq(integrationConnection.provider, "trello")
        )
      );
    expect(rows).toHaveLength(1);
    expect(
      await getIntegrationToken(db, USER_A, "trello", ENCRYPTION_KEY)
    ).toBe("dup-2");
  });
});
