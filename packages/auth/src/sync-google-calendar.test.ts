import { describe, expect, test } from "bun:test";
import type { Database } from "@personal-os/db";

import { syncGoogleCalendarIntegration } from "./sync-google-calendar";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

describe("syncGoogleCalendarIntegration", () => {
  test("does not throw when integration persistence fails", async () => {
    const throwingDb = {
      select() {
        throw new Error('relation "integration_connection" does not exist');
      },
    } as unknown as Database;

    await expect(
      syncGoogleCalendarIntegration(
        throwingDb,
        "test-encryption-key-32-bytes!!",
        {
          accessToken: "ya29.access",
          providerId: "google",
          refreshToken: "1//refresh",
          scope: `${CALENDAR_SCOPE},openid,email`,
          userId: "user-1",
        }
      )
    ).resolves.toBeUndefined();
  });

  test("skips non-google providers without touching the db", async () => {
    const db = {
      select() {
        throw new Error("should not query");
      },
    } as unknown as Database;

    await expect(
      syncGoogleCalendarIntegration(db, "key", {
        accessToken: "tok",
        providerId: "github",
        scope: CALENDAR_SCOPE,
        userId: "user-1",
      })
    ).resolves.toBeUndefined();
  });
});
