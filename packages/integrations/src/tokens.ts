import type { Database } from "@personal-os/db";
import { integrationConnection } from "@personal-os/db/schema/app";
import { and, eq } from "drizzle-orm";

import { decryptSecret, encryptSecret } from "./crypto";

export type IntegrationProvider =
  | "trello"
  | "google_calendar"
  | "gmail"
  | "notion";

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

  const values = {
    accessTokenEncrypted: encryptSecret(input.accessToken, input.encryptionKey),
    errorCode: null,
    externalAccountLabel:
      input.externalAccountLabel ?? existing?.externalAccountLabel ?? null,
    refreshTokenEncrypted,
    scopes: input.scopes ?? existing?.scopes ?? null,
    status: "connected" as const,
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
