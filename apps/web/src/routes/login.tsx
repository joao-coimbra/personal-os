import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthSplash } from "@/components/blocks/auth-16/components/auth-splash";
import { Auth16Page } from "@/components/blocks/auth-16/page";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) {
      throw redirect({ search: {}, to: "/onboarding" });
    }
  },
  component: Auth16Page,
  pendingComponent: AuthSplash,
  validateSearch: (search: Record<string, unknown>): { error?: string } => {
    const error =
      typeof search.error === "string" && search.error.length > 0
        ? search.error
        : undefined;
    return error ? { error } : {};
  },
});
