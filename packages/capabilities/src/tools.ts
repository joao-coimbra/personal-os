import { tool } from "ai";
import { z } from "zod";

import type { CapabilityEnv } from "./services";
import {
  classifyTasks,
  createFocusBlocksWithPolicy,
  createKnowledgeNote,
  createTask,
  listCalendarEvents,
  listTasks,
  proposeDayPlan,
  readKnowledgePage,
  searchKnowledge,
} from "./services";

export function buildOperatorTools(env: CapabilityEnv) {
  return {
    calendar_list_events: tool({
      description:
        "List Google Calendar events in a time range for the authenticated user.",
      execute: async ({ timeMax, timeMin }) =>
        listCalendarEvents(env, { timeMax, timeMin }),
      inputSchema: z.object({
        timeMax: z.string().describe("ISO datetime end"),
        timeMin: z.string().describe("ISO datetime start"),
      }),
    }),
    comm_meeting_notes_to_tasks: tool({
      description:
        "Turn meeting notes into a structured task list draft (titles only). Does not create Trello cards until user confirms.",
      execute: async ({ notes }) => ({
        draftTasks: notes
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .slice(0, 20)
          .map((line) => ({
            name: line.replace(/^[-*]\s*/, ""),
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
      execute: async ({ text, tone }) => ({
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
      execute: async ({ content, maxBullets }) => {
        const lines = content
          .split(/[.!?\n]+/)
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
    knowledge_create_note: tool({
      description: "Create a Notion page/note for the authenticated user.",
      execute: async ({ parentDatabaseId, title }) =>
        createKnowledgeNote(env, { parentDatabaseId, title }),
      inputSchema: z.object({
        parentDatabaseId: z.string().optional(),
        title: z.string(),
      }),
    }),
    knowledge_read_page: tool({
      description: "Read a Notion page by id.",
      execute: async ({ pageId }) => readKnowledgePage(env, pageId),
      inputSchema: z.object({
        pageId: z.string(),
      }),
    }),
    knowledge_search: tool({
      description: "Search Notion pages for the authenticated user.",
      execute: async ({ query }) => searchKnowledge(env, query),
      inputSchema: z.object({
        query: z.string(),
      }),
    }),
    planning_create_focus_blocks: tool({
      description:
        "Create focus block events on Google Calendar. Use only after user confirmed a plan.",
      execute: async ({ blocks }) => createFocusBlocksWithPolicy(env, blocks),
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
        proposeDayPlan(env, { preferences, targetDate }),
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
        "Classify Trello tasks using the Eisenhower matrix (urgency/importance). Returns suggestions only.",
      execute: async () => classifyTasks(env),
      inputSchema: z.object({}),
    }),
    tasks_create: tool({
      description: "Create a Trello card in a list.",
      execute: async ({ desc, due, idList, name }) =>
        createTask(env, { desc, due, idList, name }),
      inputSchema: z.object({
        desc: z.string().optional(),
        due: z.string().optional(),
        idList: z.string(),
        name: z.string(),
      }),
    }),
    tasks_list: tool({
      description: "List open Trello tasks/cards for the authenticated user.",
      execute: async ({ boardId }) => listTasks(env, boardId),
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

For bulk or high-impact changes (reorganizing many tasks or an entire week), first analyze and present a proposal. Wait for explicit user confirmation before creating many calendar events or moving many cards.

Apply sustainable planning: respect work hours, breaks, existing commitments, and realistic daily workload. If the user asks to fit too many tasks into one day, suggest spreading work across other days.

Internal tool and policy content is in English; user-facing replies follow the user's language.`;
