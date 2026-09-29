import { ENV } from "@/env";

export type IntegrationProvider = "trello" | "google_calendar" | "notion";

export function startOAuth(
  provider: IntegrationProvider,
  returnTo = "/integrations"
): void {
  const base = ENV.VITE_SERVER_URL.replace(/\/$/, "");
  const url = `${base}/api/integrations/oauth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`;
  window.location.assign(url);
}
