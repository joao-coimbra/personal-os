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

/**
 * Best-effort: copy Google login tokens into the calendar integration row.
 * Must never throw — Better Auth account hooks run inside the OAuth callback;
 * a failure here would turn a successful Google login into HTTP 500.
 */
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

  try {
    await saveIntegrationToken(db, {
      accessToken: account.accessToken,
      encryptionKey,
      externalAccountLabel: "Google (login)",
      provider: "google_calendar",
      refreshToken: account.refreshToken ?? undefined,
      scopes,
      userId: account.userId,
    });
  } catch (error) {
    console.error(
      "[auth] Failed to sync Google Calendar integration after OAuth:",
      error
    );
  }
}
