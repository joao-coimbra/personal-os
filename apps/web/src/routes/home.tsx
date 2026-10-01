import { createFileRoute, redirect } from "@tanstack/react-router";

/** Backwards-compatible redirect — app home lives at `/`. */
export const Route = createFileRoute("/home")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
