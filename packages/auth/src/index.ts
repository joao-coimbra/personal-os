import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@personal-os/db";
import * as schema from "@personal-os/db/schema/auth";
import { betterAuth } from "better-auth";

export type AuthConfig = {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
};

export function createAuth(
  env: AuthConfig,
  database: Database,
  desktopOrigins: readonly string[] = []
) {
  const isLocalHttp =
    env.BETTER_AUTH_URL.startsWith("http://localhost") ||
    env.BETTER_AUTH_URL.startsWith("http://127.0.0.1");

  return betterAuth({
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
    emailAndPassword: { enabled: true },
    plugins: [],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
  });
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
