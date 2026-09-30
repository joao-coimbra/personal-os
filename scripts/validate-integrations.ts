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

async function checkTrelloApiKey(apiKey: string): Promise<void> {
  const url = new URL("https://api.trello.com/1/members/me");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", "personalos-key-check");
  const response = await fetch(url);
  const body = (await response.text()).trim().toLowerCase();
  if (body.includes("invalid key")) {
    throw new Error(
      "Trello API key inválida (App not found). Crie um Power-Up em https://trello.com/power-ups/admin, gere a API Key e atualize TRELLO_API_KEY. Em Allowed origins inclua a URL do web (ex.: http://localhost:3001)."
    );
  }
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

  const trelloKey = process.env.TRELLO_API_KEY;
  if (trelloKey) {
    try {
      await checkTrelloApiKey(trelloKey);
      results.push("ok  TRELLO_API_KEY accepted by Trello");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push(`FAIL Trello key: ${message}`);
      console.log(results.join("\n"));
      throw error;
    }
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
