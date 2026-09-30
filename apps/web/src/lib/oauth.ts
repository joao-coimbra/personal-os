import { getApiUrl } from "@/lib/server-url";

export type IntegrationProvider = "trello" | "google_calendar" | "notion";

export function startOAuth(
  provider: IntegrationProvider,
  returnTo = "/integrations"
): void {
  const url = getApiUrl(
    `/api/integrations/oauth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`
  );
  window.location.assign(url);
}
