import type { Database } from "@personal-os/db";
import { integrationConnection } from "@personal-os/db/schema/app";
import { and, eq } from "drizzle-orm";

import { decryptSecret, encryptSecret } from "./crypto";

export type IntegrationProvider =
  | "trello"
  | "google_calendar"
  | "gmail"
  | "notion"
  | "anthropic"
  | "openai";

export type AiModelProvider = "anthropic" | "openai";

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
    tokenExpiresAt?: Date;
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

  const values = {
    accessTokenEncrypted: encryptSecret(input.accessToken, input.encryptionKey),
    externalAccountLabel: input.externalAccountLabel,
    refreshTokenEncrypted: input.refreshToken
      ? encryptSecret(input.refreshToken, input.encryptionKey)
      : null,
    scopes: input.scopes,
    status: "connected" as const,
    tokenExpiresAt: input.tokenExpiresAt ?? null,
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
