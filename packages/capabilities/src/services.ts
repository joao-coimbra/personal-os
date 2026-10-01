import type { Database } from "@personal-os/db";
import {
  pendingAiAction,
  taskClassification,
} from "@personal-os/db/schema/app";
import {
  addLabelToCard,
  createBoardLabel,
  createCard,
  createEvent,
  deleteEvent,
  getIntegrationToken,
  type IntegrationProvider,
  listBoardCards,
  listBoardLabels,
  listBoardLists,
  listEvents,
  listMemberBoards,
  notionAppendBlocks,
  notionCreatePage,
  notionGetPage,
  notionSearch,
  updateCard,
  updateEvent,
} from "@personal-os/integrations";
import { getValidGoogleCalendarToken } from "@personal-os/integrations/google-refresh";
import { markdownToNotionBlocks } from "@personal-os/integrations/notion-blocks";
import { and, eq } from "drizzle-orm";

import {
  classifyEisenhower,
  EISENHOWER_TRELLO_LABELS,
  type EisenhowerQuadrant,
  quadrantLabel,
} from "./eisenhower";
import {
  capabilityErrorCode,
  formatCapabilityError,
  isCalendarDisabledError,
  isCalendarScopeError,
} from "./errors";
import { planDay } from "./planning";

export interface CapabilityEnv {
  db: Database;
  encryptionKey: string;
  googleClientId?: string;
  googleClientSecret?: string;
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
  reason?: string;
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

const IMPORTANT_LABEL_RE =
  /important|importante|prioridade|pos:\s*fazer|pos:\s*agendar/i;
const URGENT_LABEL_RE = /urgent|urgente|pos:\s*fazer|pos:\s*delegar/i;

function cardHasLabel(
  card: {
    labels?: { name?: string }[];
  },
  pattern: RegExp
): boolean {
  return (card.labels ?? []).some((label) => pattern.test(label.name ?? ""));
}

async function upsertClassification(
  env: CapabilityEnv,
  task: TaskSummary,
  now: Date
): Promise<void> {
  const quadrant = (task.quadrant ?? "eliminate") as EisenhowerQuadrant;
  const existing = await env.db
    .select()
    .from(taskClassification)
    .where(
      and(
        eq(taskClassification.userId, env.userId),
        eq(taskClassification.cardId, task.id)
      )
    )
    .limit(1);

  const values = {
    boardId: task.boardId ?? null,
    cardName: task.name,
    important: quadrant === "do" || quadrant === "schedule" ? 1 : 0,
    quadrant,
    reason: task.reason ?? null,
    source: "auto",
    updatedAt: now,
    urgent: quadrant === "do" || quadrant === "delegate" ? 1 : 0,
  };

  if (existing[0]) {
    await env.db
      .update(taskClassification)
      .set(values)
      .where(eq(taskClassification.id, existing[0].id));
    return;
  }

  await env.db.insert(taskClassification).values({
    ...values,
    cardId: task.id,
    id: crypto.randomUUID(),
    userId: env.userId,
  });
}

async function persistClassifications(
  env: CapabilityEnv,
  tasks: TaskSummary[]
): Promise<void> {
  if (tasks.length === 0) {
    return;
  }
  const now = new Date();
  await Promise.all(tasks.map((task) => upsertClassification(env, task, now)));
}

async function ensureEisenhowerLabels(
  token: string,
  apiKey: string,
  boardId: string
): Promise<Map<EisenhowerQuadrant, string>> {
  const existing = await listBoardLabels(token, apiKey, boardId);
  const byName = new Map(
    existing.map((label) => [label.name?.trim() ?? "", label.id] as const)
  );
  const map = new Map<EisenhowerQuadrant, string>();
  const entries = Object.entries(EISENHOWER_TRELLO_LABELS) as [
    EisenhowerQuadrant,
    (typeof EISENHOWER_TRELLO_LABELS)[EisenhowerQuadrant],
  ][];

  await Promise.all(
    entries.map(async ([quadrant, meta]) => {
      const found = byName.get(meta.name);
      if (found) {
        map.set(quadrant, found);
        return;
      }
      try {
        const created = await createBoardLabel(token, apiKey, {
          color: meta.color,
          idBoard: boardId,
          name: meta.name,
        });
        map.set(quadrant, created.id);
      } catch {
        // Label create can fail on permissions; classification still persists locally.
      }
    })
  );
  return map;
}

async function syncCardEisenhowerLabel(input: {
  allEisenhowerIds: Set<string>;
  apiKey: string;
  card: Awaited<ReturnType<typeof listBoardCards>>[number];
  labelIds: Map<EisenhowerQuadrant, string>;
  task: TaskSummary;
  token: string;
}): Promise<void> {
  const quadrant = (input.task.quadrant ?? "eliminate") as EisenhowerQuadrant;
  const targetId = input.labelIds.get(quadrant);
  if (!targetId) {
    return;
  }
  const current = new Set(input.card.idLabels ?? []);
  const withoutEisenhower = [...current].filter(
    (id) => !input.allEisenhowerIds.has(id)
  );
  const next = [...withoutEisenhower, targetId];
  const same =
    next.length === current.size && next.every((id) => current.has(id));
  if (same) {
    return;
  }
  if (!current.has(targetId)) {
    await addLabelToCard(input.token, input.apiKey, input.task.id, targetId);
  }
  const stillHasStale = [...current].some(
    (id) => input.allEisenhowerIds.has(id) && id !== targetId
  );
  if (stillHasStale) {
    await updateCard(input.token, input.apiKey, input.task.id, {
      idLabels: next,
    });
  }
}

async function syncBoardEisenhowerLabels(
  token: string,
  apiKey: string,
  boardId: string,
  boardTasks: TaskSummary[]
): Promise<void> {
  const labelIds = await ensureEisenhowerLabels(token, apiKey, boardId);
  if (labelIds.size === 0) {
    return;
  }
  const allEisenhowerIds = new Set(labelIds.values());
  let cards: Awaited<ReturnType<typeof listBoardCards>> = [];
  try {
    cards = await listBoardCards(token, apiKey, boardId);
  } catch {
    return;
  }
  const cardById = new Map(cards.map((card) => [card.id, card]));
  await Promise.all(
    boardTasks.map(async (task) => {
      const card = cardById.get(task.id);
      if (!card) {
        return;
      }
      try {
        await syncCardEisenhowerLabel({
          allEisenhowerIds,
          apiKey,
          card,
          labelIds,
          task,
          token,
        });
      } catch {
        // Best-effort label sync; local DB remains source of truth for Home.
      }
    })
  );
}

async function syncTrelloEisenhowerLabels(
  token: string,
  apiKey: string,
  tasks: TaskSummary[]
): Promise<void> {
  const byBoard = new Map<string, TaskSummary[]>();
  for (const task of tasks) {
    if (!task.boardId) {
      continue;
    }
    const list = byBoard.get(task.boardId) ?? [];
    list.push(task);
    byBoard.set(task.boardId, list);
  }

  await Promise.all(
    [...byBoard.entries()].map(([boardId, boardTasks]) =>
      syncBoardEisenhowerLabels(token, apiKey, boardId, boardTasks)
    )
  );
}

export async function listTasks(
  env: CapabilityEnv,
  boardId?: string,
  options?: { persist?: boolean; syncLabels?: boolean }
): Promise<TaskSummary[]> {
  const token = await requireToken(env, "trello");
  if (!env.trelloApiKey) {
    throw new Error("Trello API key is not configured on the server.");
  }
  let targetBoardId = boardId;
  if (!targetBoardId) {
    const boards = await listMemberBoards(token, env.trelloApiKey);
    const seedBoard = boards.find((board) =>
      board.name.includes("[PersonalOS Seed]")
    );
    targetBoardId = seedBoard?.id ?? boards[0]?.id;
  }
  if (!targetBoardId) {
    return [];
  }
  const cards = await listBoardCards(token, env.trelloApiKey, targetBoardId);
  const now = Date.now();
  const tasks = cards
    .filter((c) => !c.closed)
    .map((c) => {
      const dueMs = c.due ? Date.parse(c.due) : null;
      const classification = classifyEisenhower({
        desc: c.desc,
        dueWithinHours: dueMs ? (dueMs - now) / (1000 * 60 * 60) : null,
        hasHighPriorityLabel: cardHasLabel(c, IMPORTANT_LABEL_RE),
        hasUrgentLabel: cardHasLabel(c, URGENT_LABEL_RE),
        name: c.name,
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
        reason: classification.reason,
        url: c.shortUrl,
      } satisfies TaskSummary;
    });

  const shouldPersist = options?.persist ?? true;
  if (shouldPersist) {
    await persistClassifications(env, tasks).catch(() => undefined);
  }
  if (options?.syncLabels) {
    await syncTrelloEisenhowerLabels(token, env.trelloApiKey, tasks).catch(
      () => undefined
    );
  }
  return tasks;
}

export async function classifyTasks(
  env: CapabilityEnv,
  options?: { syncLabels?: boolean }
) {
  const tasks = await listTasks(env, undefined, {
    persist: true,
    syncLabels: options?.syncLabels ?? true,
  });
  return tasks.map((t) => ({
    id: t.id,
    label: quadrantLabel((t.quadrant ?? "eliminate") as EisenhowerQuadrant),
    name: t.name,
    quadrant: t.quadrant,
    reason: t.reason,
  }));
}

export async function listStoredClassifications(env: CapabilityEnv) {
  const rows = await env.db
    .select()
    .from(taskClassification)
    .where(eq(taskClassification.userId, env.userId));
  return rows.map((row) => ({
    boardId: row.boardId,
    id: row.cardId,
    label: quadrantLabel(row.quadrant as EisenhowerQuadrant),
    name: row.cardName,
    quadrant: row.quadrant,
    reason: row.reason,
    source: row.source,
    updatedAt: row.updatedAt,
  }));
}

async function requireGoogleCalendarToken(env: CapabilityEnv): Promise<string> {
  const token = await getValidGoogleCalendarToken(
    env.db,
    env.userId,
    env.encryptionKey,
    {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      forceRefresh: false,
    }
  );
  if (!token) {
    throw new Error("Connect google_calendar in Integrations first.");
  }
  return token;
}

function rethrowCalendarError(error: unknown): never {
  if (isCalendarScopeError(error) || isCalendarDisabledError(error)) {
    throw new Error(formatCapabilityError(error), { cause: error });
  }
  throw error;
}

export async function listCalendarEvents(
  env: CapabilityEnv,
  input: { timeMin: string; timeMax: string }
) {
  const token = await requireGoogleCalendarToken(env);
  try {
    return await listEvents(token, input);
  } catch (error) {
    rethrowCalendarError(error);
  }
}

export async function createCalendarEvent(
  env: CapabilityEnv,
  input: {
    calendarId?: string;
    summary: string;
    description?: string;
    start: string;
    end: string;
    timeZone?: string;
  }
) {
  const token = await requireGoogleCalendarToken(env);
  try {
    return await createEvent(token, input);
  } catch (error) {
    rethrowCalendarError(error);
  }
}

export async function updateCalendarEvent(
  env: CapabilityEnv,
  input: {
    calendarId?: string;
    eventId: string;
    summary?: string;
    description?: string;
    start?: string;
    end?: string;
    timeZone?: string;
  }
) {
  const token = await requireGoogleCalendarToken(env);
  try {
    return await updateEvent(token, input);
  } catch (error) {
    rethrowCalendarError(error);
  }
}

export async function deleteCalendarEvent(
  env: CapabilityEnv,
  input: { calendarId?: string; eventId: string }
) {
  const token = await requireGoogleCalendarToken(env);
  try {
    return await deleteEvent(token, input);
  } catch (error) {
    rethrowCalendarError(error);
  }
}

export async function createFocusBlocks(
  env: CapabilityEnv,
  blocks: Array<{ end: string; start: string; summary: string }>
) {
  const token = await requireGoogleCalendarToken(env);
  try {
    const created: Awaited<ReturnType<typeof createEvent>>[] =
      await Promise.all(
        blocks.map((block) =>
          createEvent(token, {
            description: "PersonalOS focus block",
            end: block.end,
            start: block.start,
            summary: block.summary,
          })
        )
      );
    return created;
  } catch (error) {
    throw new Error(formatCapabilityError(error), { cause: error });
  }
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
  let calendarWarning: string | undefined;
  try {
    const calEvents = await listCalendarEvents(env, { timeMax, timeMin });
    events = calEvents.map((e) => ({
      end: e.end.dateTime ?? e.end.date ?? "",
      start: e.start.dateTime ?? e.start.date ?? "",
      summary: e.summary,
    }));
  } catch (error) {
    calendarWarning = formatCapabilityError(error);
    events = [];
  }
  const plan = planDay({
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
  return calendarWarning ? { ...plan, calendarWarning } : plan;
}

const HIGH_IMPACT_BLOCK_THRESHOLD = 3;

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
  try {
    const created = await createFocusBlocks(env, blocks);
    return { created, pending: false };
  } catch (error) {
    return {
      code: capabilityErrorCode(error),
      created: [],
      error: formatCapabilityError(error),
      ok: false as const,
      pending: false,
    };
  }
}

export async function createTask(
  env: CapabilityEnv,
  input: { idList: string; name: string; desc?: string; due?: string }
) {
  const token = await requireToken(env, "trello");
  if (!env.trelloApiKey) {
    throw new Error("Trello API key is not configured on the server.");
  }
  const card = await createCard(token, env.trelloApiKey, input);
  const classification = classifyEisenhower({
    desc: input.desc,
    dueWithinHours: input.due
      ? (Date.parse(input.due) - Date.now()) / (1000 * 60 * 60)
      : null,
    name: input.name,
  });
  await persistClassifications(env, [
    {
      boardId: card.idBoard,
      desc: card.desc,
      due: card.due,
      id: card.id,
      listId: card.idList,
      name: card.name,
      overdue: false,
      quadrant: classification.quadrant,
      reason: classification.reason,
      url: card.shortUrl,
    },
  ]).catch(() => undefined);
  return { ...card, quadrant: classification.quadrant };
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
  const seedBoard = boards.find((board) =>
    board.name.includes("[PersonalOS Seed]")
  );
  return seedBoard?.id ?? boards[0]?.id;
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

function notionPageTitle(page: {
  properties?: Record<string, unknown>;
}): string {
  const props = page.properties ?? {};
  for (const value of Object.values(props)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const prop = value as {
      type?: string;
      title?: Array<{ plain_text?: string }>;
    };
    if (prop.type === "title" && Array.isArray(prop.title)) {
      const text = prop.title
        .map((part) => part.plain_text ?? "")
        .join("")
        .trim();
      if (text) {
        return text;
      }
    }
  }
  return "Untitled";
}

export async function listKnowledgeNotes(
  env: CapabilityEnv,
  query = ""
): Promise<Array<{ id: string; title: string; url?: string }>> {
  const pages = await searchKnowledge(env, query);
  return pages.map((page) => ({
    id: page.id,
    title: notionPageTitle(page),
    url: page.url,
  }));
}

export async function readKnowledgePage(env: CapabilityEnv, pageId: string) {
  const token = await requireToken(env, "notion");
  return notionGetPage(token, pageId);
}

export async function createKnowledgeNote(
  env: CapabilityEnv,
  input: {
    title: string;
    parentDatabaseId?: string;
    parentPageId?: string;
    content?: string;
  }
) {
  const token = await requireToken(env, "notion");
  return notionCreatePage(token, input);
}

export async function appendKnowledgeContent(
  env: CapabilityEnv,
  input: { pageId: string; content: string }
) {
  const token = await requireToken(env, "notion");
  const blocks = markdownToNotionBlocks(input.content);
  if (blocks.length === 0) {
    return { appended: 0, pageId: input.pageId };
  }
  const result = await notionAppendBlocks(token, input.pageId, blocks);
  return { ...result, pageId: input.pageId };
}

export async function updateTrelloCard(
  ...args: Parameters<typeof updateCard>
): Promise<Awaited<ReturnType<typeof updateCard>>> {
  return await updateCard(...args);
}
