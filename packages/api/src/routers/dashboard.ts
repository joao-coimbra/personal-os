import {
  classifyTasks,
  listCalendarEvents,
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
    let classifications: Awaited<ReturnType<typeof classifyTasks>> = [];

    try {
      tasks = await listTasks(env);
    } catch {
      tasks = [];
    }
    try {
      classifications = await classifyTasks(env);
    } catch {
      classifications = [];
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
    const priority = classifications.filter(
      (c) => c.quadrant === "do" || c.quadrant === "schedule"
    );

    return {
      eventsUpcoming: events.slice(0, 5),
      overdueCount: overdue.length,
      pendingCount: tasks.length,
      preferences: prefs,
      priorityTasks: priority.slice(0, 5),
      tasksSample: tasks.slice(0, 8),
    };
  }),
};
