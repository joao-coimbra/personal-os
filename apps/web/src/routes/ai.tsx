import { createFileRoute, redirect } from "@tanstack/react-router";

import { useUiStore } from "@/stores/ui-store";

export const Route = createFileRoute("/ai")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: AiRedirect,
});

function AiRedirect() {
  useUiStore.getState().setOperatorOpen(true);
  return null;
}
