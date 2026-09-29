import { createFileRoute, redirect } from "@tanstack/react-router";

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
});
