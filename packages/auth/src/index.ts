import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@personal-os/db";
import * as schema from "@personal-os/db/schema/auth";
import { betterAuth } from "better-auth";

import { syncGoogleCalendarIntegration } from "./sync-google-calendar";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  INTEGRATION_ENCRYPTION_KEY?: string;
};

const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = []
) {
  const isLocalHttp =
    env.BETTER_AUTH_URL.startsWith("http://localhost") ||
    env.BETTER_AUTH_URL.startsWith("http://127.0.0.1");

  const googleEnabled = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
  );

  return betterAuth({
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: isLocalHttp ? "lax" : "none",
        secure: !isLocalHttp,
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    databaseHooks: {
      account: {
        create: {
          after: async (account) => {
            await syncGoogleCalendarIntegration(
              database,
              env.INTEGRATION_ENCRYPTION_KEY,
              account
            );
          },
        },
        update: {
          after: async (account) => {
            await syncGoogleCalendarIntegration(
              database,
              env.INTEGRATION_ENCRYPTION_KEY,
              account
            );
          },
        },
      },
    },
    emailAndPassword: { enabled: true },
    plugins: [],
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: googleEnabled
      ? {
          google: {
            accessType: "offline",
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
            prompt: "select_account consent",
            scope: [...GOOGLE_CALENDAR_SCOPES],
          },
        }
      : {},
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
