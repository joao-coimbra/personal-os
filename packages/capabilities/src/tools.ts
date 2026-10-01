import { tool } from "ai";
import { z } from "zod";

import { softToolResult } from "./errors";
import type { CapabilityEnv } from "./services";
import {
  appendKnowledgeContent,
  classifyTasks,
  createCalendarEvent,
  createFocusBlocksWithPolicy,
  createKnowledgeNote,
  createTask,
  deleteCalendarEvent,
  listCalendarEvents,
  listTasks,
  proposeDayPlan,
  readKnowledgePage,
  searchKnowledge,
  updateCalendarEvent,
} from "./services";

const BULLET_PREFIX_RE = /^[-*]\s*/;
const SENTENCE_SPLIT_RE = /[.!?\n]+/;

export function buildOperatorTools(env: CapabilityEnv) {
  return {
    calendar_create_event: tool({
      description:
        "Create a Google Calendar event (write). Pass ISO start/end datetimes. Use after the user asks to schedule something. Soft-fails with ok:false if Calendar API is disabled or write scope is missing — continue without aborting.",
      execute: async ({
        calendarId,
        description,
        end,
        start,
        summary,
        timeZone,
      }) =>
        softToolResult(() =>
          createCalendarEvent(env, {
            calendarId,
            description,
            end,
            start,
            summary,
            timeZone,
          })
        ),
      inputSchema: z.object({
        calendarId: z
          .string()
          .optional()
          .describe("Calendar id; defaults to primary"),
        description: z.string().optional().describe("Event description/body"),
        end: z.string().describe("ISO datetime end"),
        start: z.string().describe("ISO datetime start"),
        summary: z.string().describe("Event title"),
        timeZone: z
          .string()
          .optional()
          .describe("IANA timezone, e.g. America/Sao_Paulo"),
      }),
    }),
    calendar_delete_event: tool({
      description:
        "Delete a Google Calendar event by id. Soft-fails with ok:false if scope/API missing.",
      execute: async ({ calendarId, eventId }) =>
        softToolResult(() => deleteCalendarEvent(env, { calendarId, eventId })),
      inputSchema: z.object({
        calendarId: z.string().optional(),
        eventId: z.string().describe("Google Calendar event id"),
      }),
    }),
    calendar_list_events: tool({
      description:
        "List Google Calendar events in a time range for the authenticated user. Returns ok:false if Calendar API is disabled (403) — continue without events.",
      execute: async ({ timeMax, timeMin }) =>
        softToolResult(() => listCalendarEvents(env, { timeMax, timeMin })),
      inputSchema: z.object({
        timeMax: z.string().describe("ISO datetime end"),
        timeMin: z.string().describe("ISO datetime start"),
      }),
    }),
    calendar_update_event: tool({
      description:
        "Update an existing Google Calendar event (title, description, start/end). Soft-fails with ok:false if write scope is missing.",
      execute: async ({
        calendarId,
        description,
        end,
        eventId,
        start,
        summary,
        timeZone,
      }) =>
        softToolResult(() =>
          updateCalendarEvent(env, {
            calendarId,
            description,
            end,
            eventId,
            start,
            summary,
            timeZone,
          })
        ),
      inputSchema: z.object({
        calendarId: z.string().optional(),
        description: z.string().optional(),
        end: z.string().optional().describe("ISO datetime end"),
        eventId: z.string().describe("Google Calendar event id"),
        start: z.string().optional().describe("ISO datetime start"),
        summary: z.string().optional().describe("Event title"),
        timeZone: z.string().optional(),
      }),
    }),
    comm_meeting_notes_to_tasks: tool({
      description:
        "Turn meeting notes into a structured task list draft (titles only). Does not create Trello cards until user confirms.",
      execute: ({ notes }) => ({
        draftTasks: notes
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .slice(0, 20)
          .map((line) => ({
            name: line.replace(BULLET_PREFIX_RE, ""),
          })),
        hint: "Present the draft tasks and offer to create cards after confirmation.",
      }),
      inputSchema: z.object({
        notes: z.string().min(1),
      }),
    }),
    comm_rewrite_message: tool({
      description:
        "Prepare a professional rewrite of a message draft. Returns structured draft for you to polish in the reply.",
      execute: ({ text, tone }) => ({
        draft: text.trim(),
        hint: "Rewrite the draft in the requested tone in your reply; keep meaning intact.",
        tone: tone ?? "professional",
      }),
      inputSchema: z.object({
        text: z.string().min(1),
        tone: z
          .enum(["professional", "friendly", "concise"])
          .optional()
          .describe("Target tone"),
      }),
    }),
    comm_summarize_for_team: tool({
      description:
        "Summarize long content into bullet points suitable for a team update.",
      execute: ({ content, maxBullets }) => {
        const lines = content
          .split(SENTENCE_SPLIT_RE)
          .map((s) => s.trim())
          .filter(Boolean);
        const limit = maxBullets ?? 5;
        return {
          bullets: lines.slice(0, limit),
          hint: "Turn bullets into a clear team update in the user's language.",
        };
      },
      inputSchema: z.object({
        content: z.string().min(1),
        maxBullets: z.number().min(1).max(10).optional(),
      }),
    }),
    knowledge_append_content: tool({
      description:
        "Append markdown content as Notion blocks (paragraphs, headings, bullets, code) to an existing page. Use when the page already exists and you need more body content.",
      execute: async ({ content, pageId }) =>
        softToolResult(() => appendKnowledgeContent(env, { content, pageId })),
      inputSchema: z.object({
        content: z
          .string()
          .min(1)
          .describe("Markdown body to append as Notion blocks"),
        pageId: z.string().describe("Notion page id"),
      }),
    }),
    knowledge_create_note: tool({
      description:
        "Create a Notion page WITH body content. Always pass content (markdown) when the user asked for notes/text — not title alone. Supports headings (# ## ###), bullets, numbered lists, code fences, and paragraphs. Optionally nest under parentPageId or parentDatabaseId.",
      execute: async ({ content, parentDatabaseId, parentPageId, title }) =>
        softToolResult(() =>
          createKnowledgeNote(env, {
            content,
            parentDatabaseId,
            parentPageId,
            title,
          })
        ),
      inputSchema: z.object({
        content: z
          .string()
          .optional()
          .describe(
            "Markdown body for the page. Prefer including this whenever the user provided text/notes."
          ),
        parentDatabaseId: z.string().optional(),
        parentPageId: z
          .string()
          .optional()
          .describe("Parent Notion page id when not using a database"),
        title: z.string(),
      }),
    }),
    knowledge_read_page: tool({
      description: "Read a Notion page by id.",
      execute: async ({ pageId }) =>
        softToolResult(() => readKnowledgePage(env, pageId)),
      inputSchema: z.object({
        pageId: z.string(),
      }),
    }),
    knowledge_search: tool({
      description: "Search Notion pages for the authenticated user.",
      execute: async ({ query }) =>
        softToolResult(() => searchKnowledge(env, query)),
      inputSchema: z.object({
        query: z.string(),
      }),
    }),
    planning_create_focus_blocks: tool({
      description:
        "Create focus block events on Google Calendar. Use only after user confirmed a plan. If Calendar returns ok:false/403, explain gracefully and still deliver notes/tasks.",
      execute: async ({ blocks }) =>
        softToolResult(() => createFocusBlocksWithPolicy(env, blocks)),
      inputSchema: z.object({
        blocks: z.array(
          z.object({
            end: z.string(),
            start: z.string(),
            summary: z.string(),
          })
        ),
      }),
    }),
    planning_propose_day: tool({
      description:
        "Propose a sustainable day plan with focus blocks based on tasks, calendar, and user preferences. Does not write to calendar until confirmed.",
      execute: async ({ targetDate, preferences }) =>
        softToolResult(() => proposeDayPlan(env, { preferences, targetDate })),
      inputSchema: z.object({
        preferences: z.object({
          breakMinutes: z.number(),
          focusMinutes: z.number(),
          timezone: z.string(),
          workEnd: z.string(),
          workStart: z.string(),
        }),
        targetDate: z.string().describe("YYYY-MM-DD"),
      }),
    }),
    tasks_classify: tool({
      description:
        "Classify Trello tasks using the Eisenhower matrix (urgency/importance). Persists labels when possible. Returns suggestions.",
      execute: async () => softToolResult(() => classifyTasks(env)),
      inputSchema: z.object({}),
    }),
    tasks_create: tool({
      description: "Create a Trello card in a list.",
      execute: async ({ desc, due, idList, name }) =>
        softToolResult(() => createTask(env, { desc, due, idList, name })),
      inputSchema: z.object({
        desc: z.string().optional(),
        due: z.string().optional(),
        idList: z.string(),
        name: z.string(),
      }),
    }),
    tasks_list: tool({
      description: "List open Trello tasks/cards for the authenticated user.",
      execute: async ({ boardId }) =>
        softToolResult(() => listTasks(env, boardId)),
      inputSchema: z.object({
        boardId: z.string().optional(),
      }),
    }),
  };
}

export const OPERATOR_SYSTEM_PROMPT = `You are the PersonalOS AI Operator.

Always respond in the same language as the user's latest message.
If the user's language cannot be confidently determined, respond in Brazilian Portuguese (pt-BR).

Be concise, useful and action-oriented.

Use connected PersonalOS capabilities when they can reliably answer the user's request.

Do not claim an action was completed unless the corresponding tool confirmed success.

When a tool returns { ok: false, error, code }, explain the limitation clearly to the user and continue with whatever parts of the request you CAN fulfill (e.g. create a Notion note even if Google Calendar returns 403). Never abort the whole reply with a raw "network error".

You CAN write:
- Notion: knowledge_create_note accepts markdown content (body blocks). Prefer passing content whenever the user asked for notes/text — never create a title-only page and apologize that Notion needs "additional blocks". Use knowledge_append_content to add more blocks to an existing page.
- Google Calendar: calendar_create_event, calendar_update_event, and calendar_delete_event write to the calendar (same write scope as planning_create_focus_blocks). Prefer these when the user asks to schedule, move, or cancel a specific event.

For bulk or high-impact changes (reorganizing many tasks or an entire week), first analyze and present a proposal. Wait for explicit user confirmation before creating many calendar events or moving many cards.

Apply sustainable planning: respect work hours, breaks, existing commitments, and realistic daily workload. If the user asks to fit too many tasks into one day, suggest spreading work across other days.

Prefer Markdown in replies (headings, lists, short callouts with > quotes, fenced code when useful).

Internal tool and policy content is in English; user-facing replies follow the user's language.`;
