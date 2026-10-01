import {
  listCalendarEvents,
  listStoredClassifications,
  listTasks,
} from "@personal-os/capabilities";
import { userPreference } from "@personal-os/db/schema/app";
import { addDays, formatISO, startOfDay } from "date-fns";
import { eq } from "drizzle-orm";

import { protectedProcedure } from "../index";

function capabilityEnv(context: {
  db: import("@personal-os/db").Database;
  session: { user: { id: string } };
}) {
  const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY ?? "";
  return {
    db: context.db,
    encryptionKey,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    trelloApiKey: process.env.TRELLO_API_KEY,
    userId: context.session.user.id,
  };
}

export const dashboardRouter = {
  getOverview: protectedProcedure.handler(async ({ context }) => {
    const [prefs] = await context.db
      .select()
      .from(userPreference)
      .where(eq(userPreference.userId, context.session.user.id))
      .limit(1);
    const env = capabilityEnv(context);

    let tasks: Awaited<ReturnType<typeof listTasks>> = [];
    let events: Awaited<ReturnType<typeof listCalendarEvents>> = [];
    let stored: Awaited<ReturnType<typeof listStoredClassifications>> = [];

    try {
      // Persist + soft-sync Trello labels while loading Home.
      tasks = await listTasks(env, undefined, {
        persist: true,
        syncLabels: true,
      });
    } catch {
      tasks = [];
    }
    try {
      stored = await listStoredClassifications(env);
    } catch {
      stored = [];
    }
    try {
      const start = startOfDay(new Date());
      const end = addDays(start, 7);
      events = await listCalendarEvents(env, {
        timeMax: formatISO(end),
        timeMin: formatISO(start),
      });
    } catch {
      events = [];
    }

    const overdue = tasks.filter((t) => t.overdue);
    const classifications =
      tasks.length > 0
        ? tasks.map((t) => ({
            id: t.id,
            label: t.quadrant ?? "eliminate",
            name: t.name,
            quadrant: t.quadrant,
            reason: t.reason,
          }))
        : stored.map((row) => ({
            id: row.id,
            label: row.label,
            name: row.name,
            quadrant: row.quadrant,
            reason: row.reason ?? undefined,
          }));
    const priority = classifications.filter(
      (c) => c.quadrant === "do" || c.quadrant === "schedule"
    );

    return {
      eventsUpcoming: events.slice(0, 5),
      matrixTasks: classifications,
      overdueCount: overdue.length,
      pendingCount: tasks.length,
      preferences: prefs,
      priorityTasks: priority.slice(0, 8),
      tasksSample: tasks.slice(0, 8),
    };
  }),
};
