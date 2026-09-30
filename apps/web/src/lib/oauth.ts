import { getApiUrl } from "@/lib/server-url";

export type OAuthIntegrationProvider =
  | "trello"
  | "google_calendar"
  | "gmail"
  | "notion";

export type AiModelProvider = "anthropic" | "openai";

export type IntegrationProvider = OAuthIntegrationProvider | AiModelProvider;

export function startOAuth(
  provider: OAuthIntegrationProvider,
  returnTo = "/integrations"
): void {
  const url = getApiUrl(
    `/api/integrations/oauth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`
  );
  window.location.assign(url);
}
