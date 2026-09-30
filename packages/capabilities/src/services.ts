import type { Database } from "@personal-os/db";
import { pendingAiAction } from "@personal-os/db/schema/app";
import {
  createCard,
  createEvent,
  getIntegrationToken,
  type IntegrationProvider,
  listBoardCards,
  listBoardLists,
  listEvents,
  listMemberBoards,
  notionCreatePage,
  notionGetPage,
  notionSearch,
  updateCard,
} from "@personal-os/integrations";
import { classifyEisenhower, quadrantLabel } from "./eisenhower";
import { planDay } from "./planning";

export interface CapabilityEnv {
  db: Database;
  encryptionKey: string;
  trelloApiKey?: string;
  userId: string;
}

export interface TaskSummary {
  boardId?: string;
  desc: string;
  due: string | null;
  id: string;
  listId?: string;
  name: string;
  overdue: boolean;
  quadrant?: string;
  url?: string;
}

async function requireToken(
  env: CapabilityEnv,
  provider: IntegrationProvider
): Promise<string> {
  const token = await getIntegrationToken(
    env.db,
    env.userId,
    provider,
    env.encryptionKey
  );
  if (!token) {
    throw new Error(`Connect ${provider} in Integrations first.`);
  }
  return token;
}

export async function listTasks(
  env: CapabilityEnv,
  boardId?: string
): Promise<TaskSummary[]> {
  const token = await requireToken(env, "trello");
  if (!env.trelloApiKey) {
    throw new Error("Trello API key is not configured on the server.");
  }
  let targetBoardId = boardId;
  if (!targetBoardId) {
    const boards = await listMemberBoards(token, env.trelloApiKey);
    targetBoardId = boards[0]?.id;
  }
  if (!targetBoardId) {
    return [];
  }
  const cards = await listBoardCards(token, env.trelloApiKey, targetBoardId);
  const now = Date.now();
  return cards
    .filter((c) => !c.closed)
    .map((c) => {
      const dueMs = c.due ? Date.parse(c.due) : null;
      const classification = classifyEisenhower({
        dueWithinHours: dueMs ? (dueMs - now) / (1000 * 60 * 60) : null,
        hasHighPriorityLabel: c.name.toLowerCase().includes("important"),
      });
      return {
        boardId: targetBoardId,
        desc: c.desc,
        due: c.due,
        id: c.id,
        listId: c.idList,
        name: c.name,
        overdue: dueMs !== null && dueMs < now,
        quadrant: classification.quadrant,
        url: c.shortUrl,
      };
    });
}

export async function classifyTasks(env: CapabilityEnv) {
  const tasks = await listTasks(env);
  return tasks.map((t) => ({
    id: t.id,
    label: quadrantLabel(
      (t.quadrant ?? "eliminate") as
        | "do"
        | "schedule"
        | "delegate"
        | "eliminate"
    ),
    name: t.name,
    quadrant: t.quadrant,
  }));
}

export async function listCalendarEvents(
  env: CapabilityEnv,
  input: { timeMin: string; timeMax: string }
) {
  const token = await requireToken(env, "google_calendar");
  return listEvents(token, input);
}

export async function proposeDayPlan(
  env: CapabilityEnv,
  input: {
    targetDate: string;
    preferences: {
      breakMinutes: number;
      focusMinutes: number;
      timezone: string;
      workEnd: string;
      workStart: string;
    };
  }
) {
  const tasks = await listTasks(env);
  const timeMin = `${input.targetDate}T00:00:00Z`;
  const timeMax = `${input.targetDate}T23:59:59Z`;
  let events: Array<{ end: string; start: string; summary?: string }> = [];
  try {
    const calEvents = await listCalendarEvents(env, { timeMax, timeMin });
    events = calEvents.map((e) => ({
      end: e.end.dateTime ?? e.end.date ?? "",
      start: e.start.dateTime ?? e.start.date ?? "",
      summary: e.summary,
    }));
  } catch {
    events = [];
  }
  return planDay({
    ...input.preferences,
    events,
    targetDate: input.targetDate,
    tasks: tasks.map((t) => ({
      due: t.due,
      id: t.id,
      name: t.name,
      quadrant: t.quadrant,
    })),
  });
}

const HIGH_IMPACT_BLOCK_THRESHOLD = 3;

export async function createFocusBlocks(
  env: CapabilityEnv,
  blocks: Array<{ end: string; start: string; summary: string }>
) {
  const token = await requireToken(env, "google_calendar");
  const created = [];
  for (const block of blocks) {
    created.push(
      await createEvent(token, {
        description: "PersonalOS focus block",
        end: block.end,
        start: block.start,
        summary: block.summary,
      })
    );
  }
  return created;
}

export async function createFocusBlocksWithPolicy(
  env: CapabilityEnv,
  blocks: Array<{ end: string; start: string; summary: string }>
) {
  if (blocks.length >= HIGH_IMPACT_BLOCK_THRESHOLD) {
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await env.db.insert(pendingAiAction).values({
      expiresAt,
      id,
      kind: "create_focus_blocks",
      payload: { blocks },
      userId: env.userId,
    });
    return {
      created: [],
      message: `Created ${blocks.length} focus blocks requires confirmation. Call confirm with pendingId ${id} via Integrations or ask the app to confirm action ${id}.`,
      pending: true,
      pendingId: id,
    };
  }
  const created = await createFocusBlocks(env, blocks);
  return { created, pending: false };
}

export async function createTask(
  env: CapabilityEnv,
  input: { idList: string; name: string; desc?: string; due?: string }
) {
  const token = await requireToken(env, "trello");
  if (!env.trelloApiKey) {
    throw new Error("Trello API key is not configured on the server.");
  }
  return createCard(token, env.trelloApiKey, input);
}

async function resolveBoardId(
  env: CapabilityEnv,
  token: string,
  boardId?: string
): Promise<string | undefined> {
  if (boardId) {
    return boardId;
  }
  if (!env.trelloApiKey) {
    return undefined;
  }
  const boards = await listMemberBoards(token, env.trelloApiKey);
  return boards[0]?.id;
}

export async function listTaskLists(env: CapabilityEnv, boardId?: string) {
  const token = await requireToken(env, "trello");
  if (!env.trelloApiKey) {
    throw new Error("Trello API key is not configured on the server.");
  }
  const targetBoardId = await resolveBoardId(env, token, boardId);
  if (!targetBoardId) {
    return [];
  }
  return listBoardLists(token, env.trelloApiKey, targetBoardId);
}

export async function moveTask(
  env: CapabilityEnv,
  input: { cardId: string; idList: string }
) {
  const token = await requireToken(env, "trello");
  if (!env.trelloApiKey) {
    throw new Error("Trello API key is not configured on the server.");
  }
  return updateCard(token, env.trelloApiKey, input.cardId, {
    idList: input.idList,
  });
}

export async function searchKnowledge(env: CapabilityEnv, query: string) {
  const token = await requireToken(env, "notion");
  return notionSearch(token, query);
}

export async function readKnowledgePage(env: CapabilityEnv, pageId: string) {
  const token = await requireToken(env, "notion");
  return notionGetPage(token, pageId);
}

export async function createKnowledgeNote(
  env: CapabilityEnv,
  input: { title: string; parentDatabaseId?: string }
) {
  const token = await requireToken(env, "notion");
  return notionCreatePage(token, input);
}

export { updateCard as updateTrelloCard };
