/**
 * Idempotent PersonalOS demo workspace seed for a connected operator account.
 *
 * Seeds Trello lists/cards (Kanban + Gantt source of truth), Notion notes, and
 * Google Calendar focus events when the Calendar API is enabled on the GCP
 * OAuth project.
 *
 * Notes UI previously had no backend fetch — `notes.list` now reads Notion.
 * Gmail is intentionally out of scope.
 *
 * Usage:
 *   bun run seed
 *   bun run seed -- --email=govlad54@gmail.com
 */
import { createDb } from "@personal-os/db";
import { user } from "@personal-os/db/schema/auth";
import {
  createBoard,
  createCard,
  createEvent,
  createList,
  getIntegrationToken,
  listBoardCards,
  listBoardLists,
  listEvents,
  listMemberBoards,
  notionCreatePage,
  notionSearch,
} from "@personal-os/integrations";
import { getValidGoogleCalendarToken } from "@personal-os/integrations/google-refresh";
import { sql } from "drizzle-orm";

const SEED_MARKER = "[PersonalOS Seed]";
const BOARD_NAME = `${SEED_MARKER} Operator Board`;
const DEFAULT_EMAIL = "govlad54@gmail.com";

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addHours(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * 60 * 60 * 1000);
}

function formatISO(date: Date): string {
  return date.toISOString();
}

const LIST_SPECS = [
  { name: "Entrada", pos: 1 },
  { name: "Hoje", pos: 2 },
  { name: "Em progresso", pos: 3 },
  { name: "Agendadas", pos: 4 },
  { name: "Concluídas", pos: 5 },
] as const;

type ListName = (typeof LIST_SPECS)[number]["name"];

interface SeedCard {
  desc: string;
  dueHour?: number;
  dueOffsetDays: number | null;
  list: ListName;
  name: string;
}

interface SeedNote {
  content: string;
  title: string;
}

interface SeedEvent {
  description: string;
  durationHours: number;
  startDayOffset: number;
  startHour: number;
  summary: string;
}

function parseEmailArg(argv: string[]): string {
  for (const arg of argv) {
    if (arg.startsWith("--email=")) {
      return arg.slice("--email=".length).trim().toLowerCase();
    }
  }
  return DEFAULT_EMAIL;
}

function atLocalHour(base: Date, dayOffset: number, hour: number): Date {
  const day = addDays(startOfDay(base), dayOffset);
  day.setHours(hour, 0, 0, 0);
  return day;
}

function cardCatalog(_now: Date): SeedCard[] {
  return [
    {
      desc: `${SEED_MARKER} Triagem matinal — revisar atrasadas e priorizar o dia.`,
      dueHour: 10,
      dueOffsetDays: 0,
      list: "Hoje",
      name: "IMPORTANT · Triagem do dia (Eisenhower)",
    },
    {
      desc: `${SEED_MARKER} Bloco de foco profundo sem interrupções.`,
      dueHour: 12,
      dueOffsetDays: 0,
      list: "Em progresso",
      name: "IMPORTANT · Bloco de foco 90min",
    },
    {
      desc: `${SEED_MARKER} Inbox capture — classificar e arquivar.`,
      dueOffsetDays: null,
      list: "Entrada",
      name: "Capturar ideias da manhã",
    },
    {
      desc: `${SEED_MARKER} Preparar contexto Notion + Trello antes do checkpoint.`,
      dueHour: 15,
      dueOffsetDays: 0,
      list: "Hoje",
      name: "Checkpoint de meio-dia",
    },
    {
      desc: `${SEED_MARKER} Rascunho de comunicação com tom profissional.`,
      dueHour: 11,
      dueOffsetDays: 1,
      list: "Agendadas",
      name: "Rascunhar mensagem para stakeholders",
    },
    {
      desc: `${SEED_MARKER} Planejar amanhã com base no diário de hoje.`,
      dueHour: 9,
      dueOffsetDays: 1,
      list: "Agendadas",
      name: "IMPORTANT · Plano de amanhã",
    },
    {
      desc: `${SEED_MARKER} Revisar carga e registrar aprendizados.`,
      dueHour: 18,
      dueOffsetDays: 0,
      list: "Hoje",
      name: "Revisão noturna / diário",
    },
    {
      desc: `${SEED_MARKER} Card concluído de referência para o Kanban.`,
      dueHour: 9,
      dueOffsetDays: -1,
      list: "Concluídas",
      name: "Setup do ambiente PersonalOS",
    },
    {
      desc: `${SEED_MARKER} Delegável — pedir status sem bloquear o foco.`,
      dueHour: 14,
      dueOffsetDays: 2,
      list: "Agendadas",
      name: "Pedir update do parceiro (delegar)",
    },
    {
      desc: `${SEED_MARKER} Baixa prioridade — eliminar se não couber na semana.`,
      dueOffsetDays: null,
      list: "Entrada",
      name: "Reorganizar pasta de downloads",
    },
  ];
}

function noteCatalog(): SeedNote[] {
  return [
    {
      content:
        "Briefing do operador PersonalOS: prioridades do dia, atrasadas e próximos blocos de foco. Esta nota é criada pelo seed idempotente.",
      title: `${SEED_MARKER} Daily Brief`,
    },
    {
      content:
        "Playbook de foco: 50/15, Eisenhower na triagem, checkpoint ao meio-dia, revisão noturna. Fonte de verdade das tasks: Trello.",
      title: `${SEED_MARKER} Playbook de foco`,
    },
    {
      content:
        "Decisões abertas e contexto para o AI Operator. Use searchKnowledge / notes.list para recuperar.",
      title: `${SEED_MARKER} Contexto do projeto`,
    },
  ];
}

function eventCatalog(): SeedEvent[] {
  return [
    {
      description: `${SEED_MARKER} Time-block: triagem Eisenhower + sync Trello.`,
      durationHours: 1,
      startDayOffset: 0,
      startHour: 9,
      summary: `${SEED_MARKER} Triagem do dia`,
    },
    {
      description: `${SEED_MARKER} Deep work — sem reuniões.`,
      durationHours: 2,
      startDayOffset: 0,
      startHour: 10,
      summary: `${SEED_MARKER} Bloco de foco`,
    },
    {
      description: `${SEED_MARKER} Checkpoint rápido do plano.`,
      durationHours: 0.5,
      startDayOffset: 0,
      startHour: 12,
      summary: `${SEED_MARKER} Checkpoint`,
    },
    {
      description: `${SEED_MARKER} Comunicação / rascunhos.`,
      durationHours: 1,
      startDayOffset: 0,
      startHour: 15,
      summary: `${SEED_MARKER} Bloco de comunicação`,
    },
    {
      description: `${SEED_MARKER} Fechar o dia e preparar amanhã.`,
      durationHours: 0.75,
      startDayOffset: 0,
      startHour: 17,
      summary: `${SEED_MARKER} Revisão noturna`,
    },
    {
      description: `${SEED_MARKER} Planejamento da manhã seguinte.`,
      durationHours: 1,
      startDayOffset: 1,
      startHour: 9,
      summary: `${SEED_MARKER} Plano de amanhã`,
    },
  ];
}

async function resolveUser(
  db: ReturnType<typeof createDb>,
  email: string
): Promise<{ email: string; id: string; name: string | null }> {
  const exact = await db
    .select({ email: user.email, id: user.id, name: user.name })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);
  if (exact[0]) {
    return exact[0];
  }
  const fuzzy = await db
    .select({ email: user.email, id: user.id, name: user.name })
    .from(user)
    .where(sql`lower(${user.email}) like ${`%${email.split("@")[0]}%`}`)
    .limit(5);
  if (fuzzy.length === 1 && fuzzy[0]) {
    return fuzzy[0];
  }
  throw new Error(
    `User not found for email=${email}. Candidates=${JSON.stringify(fuzzy)}`
  );
}

async function ensureBoard(
  token: string,
  apiKey: string
): Promise<{ created: boolean; id: string; name: string }> {
  const boards = await listMemberBoards(token, apiKey);
  const existing = boards.find((board) => board.name === BOARD_NAME);
  if (existing) {
    return { created: false, id: existing.id, name: existing.name };
  }
  const created = await createBoard(token, apiKey, {
    defaultLists: false,
    desc: `${SEED_MARKER} Board seeded for PersonalOS Kanban/Gantt.`,
    name: BOARD_NAME,
  });
  return { created: true, id: created.id, name: created.name };
}

async function ensureLists(
  token: string,
  apiKey: string,
  boardId: string
): Promise<Record<ListName, string>> {
  const existing = await listBoardLists(token, apiKey, boardId);
  const byName = new Map(existing.map((list) => [list.name, list.id]));
  const ids = {} as Record<ListName, string>;
  for (const spec of LIST_SPECS) {
    const found = byName.get(spec.name);
    if (found) {
      ids[spec.name] = found;
      continue;
    }
    // Sequential writes keep Trello rate limits happy on re-seed.
    // biome-ignore lint/performance/noAwaitInLoops: intentional sequential API writes
    const created = await createList(token, apiKey, {
      idBoard: boardId,
      name: spec.name,
      pos: spec.pos,
    });
    ids[spec.name] = created.id;
  }
  return ids;
}

async function ensureCards(
  token: string,
  apiKey: string,
  boardId: string,
  listIds: Record<ListName, string>,
  now: Date
): Promise<{ created: number; skipped: number }> {
  const existing = await listBoardCards(token, apiKey, boardId);
  const existingNames = new Set(existing.map((card) => card.name));
  let created = 0;
  let skipped = 0;
  for (const card of cardCatalog(now)) {
    if (existingNames.has(card.name)) {
      skipped += 1;
      continue;
    }
    const due =
      card.dueOffsetDays === null
        ? undefined
        : formatISO(atLocalHour(now, card.dueOffsetDays, card.dueHour ?? 12));
    // biome-ignore lint/performance/noAwaitInLoops: intentional sequential API writes
    await createCard(token, apiKey, {
      desc: card.desc,
      due,
      idList: listIds[card.list],
      name: card.name,
    });
    created += 1;
  }
  return { created, skipped };
}

async function ensureNotes(
  token: string
): Promise<{ created: number; skipped: number }> {
  const existing = await notionSearch(token, SEED_MARKER);
  const titles = new Set(
    existing.map((page) => {
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
          return prop.title.map((part) => part.plain_text ?? "").join("");
        }
      }
      return "";
    })
  );
  let created = 0;
  let skipped = 0;
  for (const note of noteCatalog()) {
    if (titles.has(note.title)) {
      skipped += 1;
      continue;
    }
    // biome-ignore lint/performance/noAwaitInLoops: intentional sequential API writes
    await notionCreatePage(token, {
      content: note.content,
      title: note.title,
    });
    created += 1;
  }
  return { created, skipped };
}

async function ensureCalendarEvents(
  accessToken: string,
  now: Date
): Promise<{ created: number; error?: string; skipped: number }> {
  try {
    const timeMin = formatISO(startOfDay(now));
    const timeMax = formatISO(addDays(startOfDay(now), 7));
    const existing = await listEvents(accessToken, { timeMax, timeMin });
    const summaries = new Set(
      existing.map((event) => event.summary ?? "").filter(Boolean)
    );
    let created = 0;
    let skipped = 0;
    for (const event of eventCatalog()) {
      if (summaries.has(event.summary)) {
        skipped += 1;
        continue;
      }
      const start = atLocalHour(now, event.startDayOffset, event.startHour);
      const end = addHours(start, event.durationHours);
      // biome-ignore lint/performance/noAwaitInLoops: intentional sequential API writes
      await createEvent(accessToken, {
        description: event.description,
        end: formatISO(end),
        start: formatISO(start),
        summary: event.summary,
      });
      created += 1;
    }
    return { created, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      created: 0,
      error: message,
      skipped: 0,
    };
  }
}

async function main() {
  const email = parseEmailArg(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!(databaseUrl && encryptionKey)) {
    throw new Error(
      "DATABASE_URL and INTEGRATION_ENCRYPTION_KEY are required."
    );
  }
  if (!trelloApiKey) {
    throw new Error("TRELLO_API_KEY is required to seed Trello.");
  }

  const db = createDb({ DATABASE_URL: databaseUrl });
  const target = await resolveUser(db, email);
  console.log(`Seeding user ${target.email} (${target.id})`);

  const report: Record<string, unknown> = {
    email: target.email,
    userId: target.id,
  };

  const trelloToken = await getIntegrationToken(
    db,
    target.id,
    "trello",
    encryptionKey
  );
  if (!trelloToken) {
    throw new Error("Trello is not connected for this user.");
  }

  const board = await ensureBoard(trelloToken, trelloApiKey);
  const listIds = await ensureLists(trelloToken, trelloApiKey, board.id);
  const cards = await ensureCards(
    trelloToken,
    trelloApiKey,
    board.id,
    listIds,
    new Date()
  );
  report.trello = {
    boardCreated: board.created,
    boardId: board.id,
    boardName: board.name,
    cards,
    lists: Object.keys(listIds),
  };

  const notionToken = await getIntegrationToken(
    db,
    target.id,
    "notion",
    encryptionKey
  );
  if (notionToken) {
    report.notion = await ensureNotes(notionToken);
  } else {
    report.notion = { reason: "Notion not connected", skipped: true };
  }

  if (googleClientId && googleClientSecret) {
    try {
      const gcalToken = await getValidGoogleCalendarToken(
        db,
        target.id,
        encryptionKey,
        {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          forceRefresh: true,
        }
      );
      if (gcalToken) {
        const calendar = await ensureCalendarEvents(gcalToken, new Date());
        report.googleCalendar = calendar;
        if (calendar.error) {
          console.warn(
            "Google Calendar seed blocked:",
            calendar.error,
            "— Enable Calendar API on the OAuth GCP project, then re-run bun run seed."
          );
        }
      } else {
        report.googleCalendar = {
          reason: "google_calendar not connected",
          skipped: true,
        };
      }
    } catch (error) {
      report.googleCalendar = {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    report.googleCalendar = {
      reason: "GOOGLE_CLIENT_ID/SECRET missing",
      skipped: true,
    };
  }

  // Prefer seed board as first board for listTasks (Trello returns newest first usually).
  // listMemberBoards order is not guaranteed; pin by renaming older boards is out of scope.
  const boards = await listMemberBoards(trelloToken, trelloApiKey);
  report.trelloBoards = boards.map((boardRow) => boardRow.name);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
