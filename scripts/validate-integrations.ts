#!/usr/bin/env bun
/**
 * Live smoke checks for integration OAuth start routes and config.
 * Does not complete third-party OAuth consents (requires browser + real accounts).
 */
const API = process.env.BETTER_AUTH_URL
  ? new URL(process.env.BETTER_AUTH_URL).origin
  : "http://localhost:3000";

const PROVIDERS = ["trello", "google_calendar", "gmail", "notion"] as const;

async function checkUnauthStart(provider: string): Promise<string> {
  const response = await fetch(
    `${API}/api/integrations/oauth/${provider}/start?returnTo=%2Fintegrations`,
    { redirect: "manual" }
  );
  if (response.status !== 302) {
    throw new Error(`${provider}: expected 302, got ${response.status}`);
  }
  const location = response.headers.get("location") ?? "";
  if (!location.includes("/login")) {
    throw new Error(
      `${provider}: unauthenticated start must redirect to login`
    );
  }
  return location;
}

async function main() {
  const results: string[] = [];

  const startChecks = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const location = await checkUnauthStart(provider);
      return `ok  ${provider} start → login (${location})`;
    })
  );
  results.push(...startChecks);

  const bogus = await fetch(
    `${API}/api/integrations/oauth/not-a-provider/start`,
    { redirect: "manual" }
  );
  if (bogus.status !== 302) {
    throw new Error(`bogus provider: expected 302, got ${bogus.status}`);
  }
  results.push("ok  unknown provider still requires login first");

  const required = [
    "INTEGRATION_ENCRYPTION_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "NOTION_CLIENT_ID",
    "NOTION_CLIENT_SECRET",
    "TRELLO_API_KEY",
  ];
  for (const key of required) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`missing env ${key}`);
    }
    results.push(`ok  env ${key} present`);
  }

  console.log(results.join("\n"));
  console.log(
    "\nNote: Gmail OAuth is wired; operator tools for Gmail are not shipped yet."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
