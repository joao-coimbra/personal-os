import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createDb } from "@personal-os/db";
import { pendingAiAction } from "@personal-os/db/schema/app";
import { user } from "@personal-os/db/schema/auth";
import { and, eq } from "drizzle-orm";

import {
  createFocusBlocksWithPolicy,
  listCalendarEvents,
  listTasks,
  searchKnowledge,
} from "./services";
import { buildOperatorTools } from "./tools";

const ENCRYPTION_KEY =
  process.env.INTEGRATION_ENCRYPTION_KEY ??
  "test-integration-encryption-key-32b!";

const USER_A = "capability-test-user-a";
const USER_B = "capability-test-user-b";

const CONNECT_TRELLO = /Connect trello/;
const CONNECT_CALENDAR = /Connect google_calendar/;
const CONNECT_NOTION = /Connect notion/;

describe("capabilities require per-user connections", () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    test.skip("DATABASE_URL required", () => undefined);
    return;
  }

  const db = createDb({ DATABASE_URL: databaseUrl });

  beforeAll(async () => {
    await Promise.all(
      [USER_A, USER_B].map((id) =>
        db
          .insert(user)
          .values({
            email: `${id}@example.test`,
            id,
            name: id,
          })
          .onConflictDoNothing()
      )
    );
  });

  afterAll(async () => {
    await Promise.all([
      db.delete(pendingAiAction).where(eq(pendingAiAction.userId, USER_A)),
      db.delete(pendingAiAction).where(eq(pendingAiAction.userId, USER_B)),
    ]);
    await Promise.all([
      db.delete(user).where(eq(user.id, USER_A)),
      db.delete(user).where(eq(user.id, USER_B)),
    ]);
  });

  test("operator tools refuse when the caller has no connection", async () => {
    const env = {
      db,
      encryptionKey: ENCRYPTION_KEY,
      trelloApiKey: "test-key",
      userId: USER_A,
    };

    await expect(listTasks(env)).rejects.toThrow(CONNECT_TRELLO);
    await expect(
      listCalendarEvents(env, {
        timeMax: "2026-01-02T00:00:00Z",
        timeMin: "2026-01-01T00:00:00Z",
      })
    ).rejects.toThrow(CONNECT_CALENDAR);
    await expect(searchKnowledge(env, "notes")).rejects.toThrow(CONNECT_NOTION);
  });

  test("pending focus blocks are stored under the acting user only", async () => {
    const envA = {
      db,
      encryptionKey: ENCRYPTION_KEY,
      userId: USER_A,
    };
    const result = await createFocusBlocksWithPolicy(envA, [
      {
        end: "2026-01-01T11:00:00Z",
        start: "2026-01-01T10:00:00Z",
        summary: "Focus 1",
      },
      {
        end: "2026-01-01T13:00:00Z",
        start: "2026-01-01T12:00:00Z",
        summary: "Focus 2",
      },
      {
        end: "2026-01-01T15:00:00Z",
        start: "2026-01-01T14:00:00Z",
        summary: "Focus 3",
      },
    ]);

    expect(result.pending).toBe(true);
    const { pendingId } = result;
    expect(pendingId).toBeTruthy();
    if (!pendingId) {
      throw new Error("expected pendingId");
    }

    const forA = await db
      .select()
      .from(pendingAiAction)
      .where(
        and(
          eq(pendingAiAction.id, pendingId),
          eq(pendingAiAction.userId, USER_A)
        )
      );
    expect(forA).toHaveLength(1);

    const forB = await db
      .select()
      .from(pendingAiAction)
      .where(
        and(
          eq(pendingAiAction.id, pendingId),
          eq(pendingAiAction.userId, USER_B)
        )
      );
    expect(forB).toHaveLength(0);
  });

  test("operator tool surface covers connected providers except gmail stub", () => {
    const tools = buildOperatorTools({
      db,
      encryptionKey: ENCRYPTION_KEY,
      userId: USER_A,
    });
    expect(Object.keys(tools).sort()).toEqual(
      [
        "calendar_list_events",
        "comm_meeting_notes_to_tasks",
        "comm_rewrite_message",
        "comm_summarize_for_team",
        "knowledge_create_note",
        "knowledge_read_page",
        "knowledge_search",
        "planning_create_focus_blocks",
        "planning_propose_day",
        "tasks_classify",
        "tasks_create",
        "tasks_list",
      ].sort()
    );
    expect(Object.keys(tools).some((name) => name.startsWith("gmail_"))).toBe(
      false
    );
  });
});
