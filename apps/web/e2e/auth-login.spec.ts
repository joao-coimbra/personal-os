import { expect, test } from "@playwright/test";

const GOOGLE_OAUTH_HOST = /accounts\.google\.com/;
const GITHUB_LOGIN_HOST = /github\.com\/login/;

/**
 * Auth method smoke tests for the login screen.
 * Social flows assert redirect to the provider authorize URL (full OAuth needs a human).
 * Magic link asserts Resend accepts the request with a Resend test inbox.
 */
test.describe("login methods", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "De volta ao foco." })
    ).toBeVisible();
  });

  test("renders Google, GitHub and magic-link controls", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Continuar com Google" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuar com GitHub" })
    ).toBeVisible();
    await expect(page.getByLabel("E-mail de trabalho")).toBeVisible();
    await expect(
      page.getByRole("button", { exact: true, name: "Continuar" })
    ).toBeVisible();

    const integrations = page.getByRole("list", {
      name: "Integrações do PersonalOS",
    });
    await expect(integrations).toContainText("Trello");
    await expect(integrations).toContainText("Google Calendar");
    await expect(integrations).toContainText("Gmail");
    await expect(integrations).toContainText("Notion");
  });

  test("Google sign-in redirects to Google OAuth", async ({ page }) => {
    await page.getByRole("button", { name: "Continuar com Google" }).click();
    await page.waitForURL(GOOGLE_OAUTH_HOST, { timeout: 20_000 });
    const url = new URL(page.url());
    expect(url.hostname).toContain("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBeTruthy();
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/callback/google"
    );
    expect(url.searchParams.get("scope") ?? "").toContain("calendar.events");
  });

  test("GitHub sign-in redirects to GitHub OAuth", async ({ page }) => {
    await page.getByRole("button", { name: "Continuar com GitHub" }).click();
    // GitHub may land on /login?return_to=/login/oauth/authorize when logged out.
    await page.waitForURL(GITHUB_LOGIN_HOST, { timeout: 20_000 });
    const url = new URL(page.url());
    expect(url.hostname).toBe("github.com");
    expect(url.searchParams.get("client_id")).toBeTruthy();
    const returnTo = url.searchParams.get("return_to") ?? url.pathname;
    expect(returnTo).toContain("/login/oauth/authorize");
    expect(decodeURIComponent(returnTo)).toContain(
      "redirect_uri=http://localhost:3000/api/auth/callback/github"
    );
  });

  test("magic link accepts Resend test inbox and shows confirmation", async ({
    page,
  }) => {
    await page.getByLabel("E-mail de trabalho").fill("delivered@resend.dev");
    await page.getByRole("button", { exact: true, name: "Continuar" }).click();
    await expect(page.getByText("Verifique seu e-mail")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("delivered@resend.dev")).toBeVisible();
  });
});
