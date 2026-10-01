import type { Database } from "@personal-os/db";
import { integrationConnection } from "@personal-os/db/schema/app";
import { account } from "@personal-os/db/schema/auth";
import { and, eq } from "drizzle-orm";

import { decryptSecret } from "./crypto";
import { getIntegrationToken, saveIntegrationToken } from "./tokens";

const TOKEN_SKEW_MS = 60_000;

export async function refreshGoogleAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${response.status}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  };
}

/**
 * Returns a usable Google Calendar access token, refreshing via the stored
 * refresh token when Better Auth's account token is expired or missing.
 */
export async function getValidGoogleCalendarToken(
  db: Database,
  userId: string,
  encryptionKey: string,
  oauth?: {
    clientId?: string;
    clientSecret?: string;
    forceRefresh?: boolean;
  }
): Promise<string | null> {
  const rows = await db
    .select()
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.userId, userId),
        eq(integrationConnection.provider, "google_calendar"),
        eq(integrationConnection.status, "connected")
      )
    )
    .limit(1);
  const [row] = rows;
  if (!row?.accessTokenEncrypted) {
    return null;
  }

  const expired =
    row.tokenExpiresAt !== null &&
    row.tokenExpiresAt.getTime() <= Date.now() + TOKEN_SKEW_MS;

  const current = await getIntegrationToken(
    db,
    userId,
    "google_calendar",
    encryptionKey
  );

  const accountRows = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1);
  const [googleAccount] = accountRows;
  const accountExpired =
    googleAccount?.accessTokenExpiresAt !== null &&
    googleAccount?.accessTokenExpiresAt !== undefined &&
    googleAccount.accessTokenExpiresAt.getTime() <= Date.now() + TOKEN_SKEW_MS;

  const shouldRefresh =
    Boolean(
      oauth?.clientId && oauth.clientSecret && row.refreshTokenEncrypted
    ) && Boolean(oauth.forceRefresh || expired || accountExpired || !current);

  if (!shouldRefresh) {
    return current;
  }

  if (!(oauth?.clientId && oauth.clientSecret && row.refreshTokenEncrypted)) {
    return current;
  }

  const refreshToken = decryptSecret(row.refreshTokenEncrypted, encryptionKey);
  const refreshed = await refreshGoogleAccessToken({
    clientId: oauth.clientId,
    clientSecret: oauth.clientSecret,
    refreshToken,
  });

  const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
  await saveIntegrationToken(db, {
    accessToken: refreshed.accessToken,
    encryptionKey,
    externalAccountLabel: row.externalAccountLabel ?? undefined,
    provider: "google_calendar",
    refreshToken,
    scopes: row.scopes ?? undefined,
    tokenExpiresAt: expiresAt,
    userId,
  });

  if (googleAccount) {
    await db
      .update(account)
      .set({
        accessToken: refreshed.accessToken,
        accessTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(account.id, googleAccount.id));
  }

  return refreshed.accessToken;
}
