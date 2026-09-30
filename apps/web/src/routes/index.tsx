import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthSplash } from "@/components/blocks/auth-16/components/auth-splash";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: "/home" });
  },
  pendingComponent: AuthSplash,
});
