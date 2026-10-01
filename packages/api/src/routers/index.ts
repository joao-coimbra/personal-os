import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";

import { aiRouter } from "./ai";
import { dashboardRouter } from "./dashboard";
import { filesRouter } from "./files";
import { integrationsRouter } from "./integrations";
import { notesRouter } from "./notes";
import { preferencesRouter } from "./preferences";
import { tasksRouter } from "./tasks";

export const appRouter = {
  ai: aiRouter,
  dashboard: dashboardRouter,
  files: filesRouter,
  healthCheck: publicProcedure.handler(() => "OK"),
  integrations: integrationsRouter,
  notes: notesRouter,
  preferences: preferencesRouter,
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  tasks: tasksRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
