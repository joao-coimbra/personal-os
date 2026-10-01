import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@personal-os/db";
import * as schema from "@personal-os/db/schema/auth";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins/magic-link";

import { sendMagicLinkEmail } from "./send-magic-link";
import { syncGoogleCalendarIntegration } from "./sync-google-calendar";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  INTEGRATION_ENCRYPTION_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
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
  const githubEnabled = Boolean(
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
  );

  const trustedProviders = [
    ...(googleEnabled ? (["google"] as const) : []),
    ...(githubEnabled ? (["github"] as const) : []),
  ];

  return betterAuth({
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders,
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
    emailAndPassword: { enabled: false },
    plugins: [
      magicLink({
        expiresIn: 60 * 10,
        sendMagicLink: async ({ email, url }) => {
          if (!env.RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not configured.");
          }
          if (!env.RESEND_FROM_EMAIL) {
            throw new Error("RESEND_FROM_EMAIL is not configured.");
          }
          await sendMagicLinkEmail({
            email,
            from: env.RESEND_FROM_EMAIL,
            resendApiKey: env.RESEND_API_KEY,
            url,
          });
        },
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      ...(googleEnabled
        ? {
            google: {
              accessType: "offline",
              clientId: env.GOOGLE_CLIENT_ID as string,
              clientSecret: env.GOOGLE_CLIENT_SECRET as string,
              prompt: "select_account consent",
              scope: [...GOOGLE_CALENDAR_SCOPES],
            },
          }
        : {}),
      ...(githubEnabled
        ? {
            github: {
              clientId: env.GITHUB_CLIENT_ID as string,
              clientSecret: env.GITHUB_CLIENT_SECRET as string,
            },
          }
        : {}),
    },
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
