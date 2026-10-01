import type { Database } from "@personal-os/db";
import { saveIntegrationToken } from "@personal-os/integrations";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export interface GoogleAccountTokens {
  accessToken?: string | null;
  providerId: string;
  refreshToken?: string | null;
  scope?: string | null;
  userId: string;
}

export async function syncGoogleCalendarIntegration(
  db: Database,
  encryptionKey: string | undefined,
  account: GoogleAccountTokens
): Promise<void> {
  if (account.providerId !== "google") {
    return;
  }
  if (!(encryptionKey && account.accessToken)) {
    return;
  }
  const scopes = account.scope ?? "";
  if (!scopes.includes(CALENDAR_SCOPE)) {
    return;
  }

  await saveIntegrationToken(db, {
    accessToken: account.accessToken,
    encryptionKey,
    externalAccountLabel: "Google (login)",
    provider: "google_calendar",
    refreshToken: account.refreshToken ?? undefined,
    scopes,
    userId: account.userId,
  });
}
