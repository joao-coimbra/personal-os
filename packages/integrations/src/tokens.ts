import type { Database } from "@personal-os/db";
import { integrationConnection } from "@personal-os/db/schema/app";
import { and, eq } from "drizzle-orm";

import { decryptSecret, encryptSecret } from "./crypto";
import { type OAuthEnv, refreshTrelloAccessToken } from "./oauth";

export type IntegrationProvider =
  | "trello"
  | "google_calendar"
  | "gmail"
  | "notion";

const REFRESH_SKEW_MS = 60_000;

export async function getIntegrationToken(
  db: Database,
  userId: string,
  provider: IntegrationProvider,
  encryptionKey: string
): Promise<string | null> {
  const rows = await db
    .select()
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.userId, userId),
        eq(integrationConnection.provider, provider),
        eq(integrationConnection.status, "connected")
      )
    )
    .limit(1);
  const [row] = rows;
  if (!row?.accessTokenEncrypted) {
    return null;
  }
  return decryptSecret(row.accessTokenEncrypted, encryptionKey);
}

/**
 * Returns a usable access token, refreshing Trello OAuth 2.0 tokens when near expiry.
 */
export async function getFreshIntegrationToken(
  db: Database,
  userId: string,
  provider: IntegrationProvider,
  encryptionKey: string,
  oauthEnv?: Pick<OAuthEnv, "trelloClientId" | "trelloClientSecret">
): Promise<string | null> {
  const rows = await db
    .select()
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.userId, userId),
        eq(integrationConnection.provider, provider),
        eq(integrationConnection.status, "connected")
      )
    )
    .limit(1);
  const [row] = rows;
  if (!row?.accessTokenEncrypted) {
    return null;
  }

  const accessToken = decryptSecret(row.accessTokenEncrypted, encryptionKey);
  const needsRefresh =
    provider === "trello" &&
    row.tokenExpiresAt !== null &&
    row.tokenExpiresAt.getTime() - Date.now() < REFRESH_SKEW_MS;

  if (!needsRefresh) {
    return accessToken;
  }

  if (
    !(
      row.refreshTokenEncrypted &&
      oauthEnv?.trelloClientId &&
      oauthEnv.trelloClientSecret
    )
  ) {
    return accessToken;
  }

  const refreshToken = decryptSecret(row.refreshTokenEncrypted, encryptionKey);
  const refreshed = await refreshTrelloAccessToken(refreshToken, {
    appOrigin: "",
    encryptionKey,
    serverOrigin: "",
    trelloClientId: oauthEnv.trelloClientId,
    trelloClientSecret: oauthEnv.trelloClientSecret,
  });

  await saveIntegrationToken(db, {
    accessToken: refreshed.accessToken,
    encryptionKey,
    expiresInSeconds: refreshed.expiresIn,
    provider,
    refreshToken: refreshed.refreshToken,
    scopes: refreshed.scopes,
    userId,
  });

  return refreshed.accessToken;
}

export async function saveIntegrationToken(
  db: Database,
  input: {
    userId: string;
    provider: IntegrationProvider;
    accessToken: string;
    refreshToken?: string;
    scopes?: string;
    externalAccountLabel?: string;
    encryptionKey: string;
    expiresInSeconds?: number;
  }
) {
  const existingRows = await db
    .select()
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.userId, input.userId),
        eq(integrationConnection.provider, input.provider)
      )
    )
    .limit(1);
  const [existing] = existingRows;

  const refreshTokenEncrypted = input.refreshToken
    ? encryptSecret(input.refreshToken, input.encryptionKey)
    : (existing?.refreshTokenEncrypted ?? null);

  const tokenExpiresAt =
    input.expiresInSeconds === undefined
      ? (existing?.tokenExpiresAt ?? null)
      : new Date(Date.now() + input.expiresInSeconds * 1000);

  const values = {
    accessTokenEncrypted: encryptSecret(input.accessToken, input.encryptionKey),
    errorCode: null,
    externalAccountLabel:
      input.externalAccountLabel ?? existing?.externalAccountLabel ?? null,
    refreshTokenEncrypted,
    scopes: input.scopes ?? existing?.scopes ?? null,
    status: "connected" as const,
    tokenExpiresAt,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(integrationConnection)
      .set(values)
      .where(eq(integrationConnection.id, existing.id));
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db.insert(integrationConnection).values({
    id,
    provider: input.provider,
    userId: input.userId,
    ...values,
  });
  return id;
}

/** Clears secrets and marks the connection disconnected for one user+provider. */
export async function clearIntegrationConnection(
  db: Database,
  userId: string,
  provider: IntegrationProvider
): Promise<void> {
  await db
    .update(integrationConnection)
    .set({
      accessTokenEncrypted: null,
      errorCode: null,
      externalAccountLabel: null,
      lastSyncAt: null,
      metadata: null,
      refreshTokenEncrypted: null,
      scopes: null,
      status: "disconnected",
      tokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrationConnection.userId, userId),
        eq(integrationConnection.provider, provider)
      )
    );
}
