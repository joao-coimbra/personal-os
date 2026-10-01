// @ts-nocheck
import type {
  GanttEvent,
  GanttResource,
} from "@personal-os/ui/components/reui/gantt/gantt-types";

/** What executes a stage. Drives the glyph on the bar and in the tree label. */
type StageKind = "agent" | "tool" | "approval" | "eval";

/** Where a stage has got to. Drives the bar color and the status badge. */
type StageStatus = "succeeded" | "running" | "waiting" | "failed" | "queued";

/** One call a stage made while it ran, shown in the stage sheet trace. */
interface ToolCall {
  latency: string;
  name: string;
  ok: boolean;
}

/** Per-bar payload carried on the gantt event. */
interface StageData {
  /** Attempt number and total, set only on a stage that retried. */
  attempt?: number;
  attempts?: number;
  costUsd: number;
  error?: { title: string; detail: string };
  /**
   * A frozen compliance window. The bar is readOnly, and no other bar in the
   * same row may be dragged across it.
   */
  frozen?: boolean;
  kind: StageKind;
  note?: string;
  /** The agent that ran it, or the tool id it called. */
  runner: string;
  /** Shard index and total, set only on a stage that fanned out. */
  shard?: number;
  shards?: number;
  stageId: string;
  status: StageStatus;
  tokens: number;
  toolCalls: ToolCall[];
  workflowId: string;
}

type StageBar = GanttEvent<StageData>;

/** One stage of a playbook: a leaf row that owns one or more bars. */
interface StageMeta {
  /** Upstream stage ids. Edges never cross a workflow boundary. */
  dependsOn: string[];
  description: string;
  /**
   * A human gate. The row takes scheduleMode "single", so it can never grow a
   * second lane and a concurrent drop is refused by the engine itself.
   */
  gate?: boolean;
  id: string;
  kind: StageKind;
  runner: string;
  title: string;
}

/** One playbook: a group row whose stages roll up into its summary strip. */
interface WorkflowMeta {
  /** Everything in this playbook must finish by here, in minutes past midnight. */
  cutoffMin: number;
  id: string;
  /** Playbook id, rendered beside the title in the tree label. */
  playbook: string;
  /** Run id, shown in the stage sheet and the copy action. */
  run: string;
  stages: StageMeta[];
  title: string;
}

/**
 * The board is read at this minute past midnight. Everything behind it has
 * closed out, the bars straddling it are running, everything ahead is still
 * queued. A pinned demo date never contains the wall clock, so this constant
 * is what gives the day a front line, not the now indicator.
 */
const DEMO_NOW_MIN = 11 * 60 + 20;

/** Portraits pinned to the identities the gantt category already uses. */
const NORA_VALE_PORTRAIT =
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80";
const LEO_GRANT_PORTRAIT =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80";

/** Approvers, shown in the stage sheet on approval stages only. */
const APPROVERS: Record<string, { name: string; role: string; image: string }> =
  {
    "ci-review": {
      image: LEO_GRANT_PORTRAIT,
      name: "Você",
      role: "Revisão de foco",
    },
    "rf-approval": {
      image: NORA_VALE_PORTRAIT,
      name: "Você",
      role: "Operador PersonalOS",
    },
  };

/** Bar color per status. Kind is carried by the glyph, so hue stays free for state. */
const STATUS_COLOR: Record<StageStatus, string> = {
  failed: "var(--color-rose-500)",
  queued: "var(--color-zinc-400)",
  running: "var(--color-sky-500)",
  succeeded: "var(--color-emerald-500)",
  waiting: "var(--color-amber-500)",
};

const STATUS_LABEL: Record<StageStatus, string> = {
  failed: "Falhou",
  queued: "Na fila",
  running: "Em execução",
  succeeded: "Concluído",
  waiting: "Aguardando",
};

/** Status dot tone, paired with the label so state is never color only. */
const STATUS_DOT: Record<StageStatus, string> = {
  failed: "bg-rose-500",
  queued: "bg-zinc-400",
  running: "bg-sky-500",
  succeeded: "bg-emerald-500",
  waiting: "bg-amber-500",
};

/** Status hue as a text colour, for glyphs rather than filled dots. */
const STATUS_TEXT: Record<StageStatus, string> = {
  failed: "text-rose-600 dark:text-rose-500",
  queued: "text-zinc-500 dark:text-zinc-400",
  running: "text-sky-600 dark:text-sky-500",
  succeeded: "text-emerald-600 dark:text-emerald-500",
  waiting: "text-amber-600 dark:text-amber-500",
};

const KIND_LABEL: Record<StageKind, string> = {
  agent: "Agente",
  approval: "Aprovação",
  eval: "Avaliação",
  tool: "Ferramenta",
};

const STAGE_STATUSES: StageStatus[] = [
  "running",
  "waiting",
  "failed",
  "queued",
  "succeeded",
];

/**
 * The four playbooks on shift. Refund Escalation leads because it carries both
 * the gate and the retry storm, and those are the two states an operator has to
 * see without scrolling.
 */
const WORKFLOWS: WorkflowMeta[] = [
  {
    // Critico: plano do dia precisa fechar ate 12:00
    cutoffMin: 12 * 60,
    id: "pb-31",
    playbook: "POS-01",
    run: "RUN-DIA",
    stages: [
      {
        dependsOn: [],
        description: "Puxa cards abertos e vencimentos do board principal.",
        id: "rf-intake",
        kind: "tool",
        runner: "trello.listTasks",
        title: "Sincronizar Trello",
      },
      {
        dependsOn: ["rf-intake"],
        description: "Sugere quadrantes Fazer / Agendar / Delegar / Eliminar.",
        id: "rf-policy",
        kind: "agent",
        runner: "Operador PersonalOS",
        title: "Classificar Eisenhower",
      },
      {
        dependsOn: ["rf-policy"],
        description: "Voce confirma o conjunto sustentavel de prioridades.",
        gate: true,
        id: "rf-approval",
        kind: "approval",
        runner: "Operador",
        title: "Aprovar plano",
      },
      {
        dependsOn: ["rf-approval"],
        description: "Agenda blocos no Google Calendar com base no plano.",
        id: "rf-capture",
        kind: "tool",
        runner: "calendar.createFocusBlocks",
        title: "Criar blocos de foco",
      },
      {
        dependsOn: ["rf-capture"],
        description:
          "Entrega o briefing do dia com atrasadas e proximos eventos.",
        id: "rf-notify",
        kind: "agent",
        runner: "Operador PersonalOS",
        title: "Resumo matinal",
      },
    ],
    title: "Triagem do dia",
  },
  {
    cutoffMin: 14 * 60,
    id: "pb-44",
    playbook: "POS-02",
    run: "RUN-FOCO",
    stages: [
      {
        dependsOn: [],
        description: "Busca notas e materiais ligados as tasks do bloco.",
        id: "ci-fetch",
        kind: "tool",
        runner: "notion.search",
        title: "Preparar contexto",
      },
      {
        dependsOn: ["ci-fetch"],
        description: "Parte o trabalho em fatias executaveis em paralelo.",
        id: "ci-parse",
        kind: "agent",
        runner: "Operador PersonalOS",
        title: "Dividir subtarefas",
      },
      {
        dependsOn: ["ci-parse"],
        description: "Avanca cada fatia do bloco de foco.",
        id: "ci-summarize",
        kind: "agent",
        runner: "Operador PersonalOS",
        title: "Executar fatias",
      },
      {
        dependsOn: ["ci-summarize"],
        description: "Confirma se o bloco fecha ou precisa de outro ciclo.",
        gate: true,
        id: "ci-review",
        kind: "approval",
        runner: "Operador",
        title: "Checkpoint",
      },
    ],
    title: "Bloco de foco",
  },
  {
    cutoffMin: 20 * 60,
    id: "pb-19",
    playbook: "POS-03",
    run: "RUN-COMMS",
    stages: [
      {
        dependsOn: [],
        description: "Junta contexto de cards e notas antes de redigir.",
        id: "ds-snapshot",
        kind: "tool",
        runner: "trello + notion",
        title: "Coletar insumos",
      },
      {
        dependsOn: ["ds-snapshot"],
        description: "Gera rascunho profissional alinhado ao tom escolhido.",
        id: "ds-dedupe",
        kind: "agent",
        runner: "Operador PersonalOS",
        title: "Rascunhar mensagem",
      },
      {
        dependsOn: ["ds-dedupe"],
        description: "Ajusta clareza, comprimento e risco de mal-entendido.",
        id: "ds-purge",
        kind: "agent",
        runner: "Operador PersonalOS",
        title: "Revisar tom",
      },
      {
        dependsOn: ["ds-purge"],
        description: "Disponibiliza o texto no painel do operador.",
        id: "ds-reindex",
        kind: "tool",
        runner: "operator.draft",
        title: "Entregar rascunho",
      },
    ],
    title: "Comunicacao",
  },
  {
    cutoffMin: 8 * 60,
    id: "pb-52",
    playbook: "POS-04",
    run: "RUN-NIGHT",
    stages: [
      {
        dependsOn: [],
        description: "Agrega concluidas, atrasadas e o que ficou para amanha.",
        id: "ev-build",
        kind: "eval",
        runner: "dashboard.getOverview",
        title: "Recolher o dia",
      },
      {
        dependsOn: ["ev-build"],
        description: "Verifica se o plano foi sustentavel e onde falhou.",
        id: "ev-run",
        kind: "eval",
        runner: "Operador PersonalOS",
        title: "Avaliar carga",
      },
      {
        dependsOn: ["ev-run"],
        description:
          "Registra aprendizados e sementes para a triagem de amanha.",
        id: "ev-publish",
        kind: "agent",
        runner: "Operador PersonalOS",
        title: "Fechar diario",
      },
    ],
    title: "Revisao noturna",
  },
];

const ALL_STAGES: StageMeta[] = WORKFLOWS.flatMap(
  (workflow) => workflow.stages
);
const STAGE_BY_ID = new Map(ALL_STAGES.map((stage) => [stage.id, stage]));
const WORKFLOW_BY_ID = new Map(
  WORKFLOWS.map((workflow) => [workflow.id, workflow])
);
const WORKFLOW_BY_STAGE = new Map(
  WORKFLOWS.flatMap((workflow) =>
    workflow.stages.map((stage) => [stage.id, workflow] as const)
  )
);

/** Adjacency in the direction the graph is read: stage id to its upstream ids. */
const STAGE_EDGES: Record<string, string[]> = Object.fromEntries(
  ALL_STAGES.map((stage) => [stage.id, stage.dependsOn])
);

/** The tree the gantt renders. Gate rows pin themselves to a single track. */
const WORKFLOW_TREE: GanttResource[] = WORKFLOWS.map((workflow) => ({
  children: workflow.stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    ...(stage.gate ? { scheduleMode: "single" as const } : {}),
  })),
  id: workflow.id,
  title: workflow.title,
}));

/** The finished overnight playbook opens collapsed so the board leads with live work. */
const COLLAPSED_ON_OPEN: string[] = ["pb-52"];

interface BarSeed {
  attempt?: number;
  attempts?: number;
  costUsd: number;
  error?: { title: string; detail: string };
  /** Start and end as [hour, minute] in local time on the anchor day. */
  from: [number, number];
  frozen?: boolean;
  note?: string;
  shard?: number;
  shards?: number;
  stageId: string;
  status: StageStatus;
  to: [number, number];
  tokens: number;
  toolCalls: ToolCall[];
}

/**
 * One operations day. Three shapes are deliberate and each one is a state the
 * board exists to show: Finance Approval holds two non overlapping bars in a
 * gate row, Capture Refund holds three attempts that overlap because the retry
 * fires before the previous call times out, and Parse Batch holds three shards
 * running at once. Everything else is one bar per stage.
 */
const BAR_SEEDS: BarSeed[] = [
  // Refund Escalation: clean until the approval, then the pathology
  {
    costUsd: 0.021,
    from: [8, 0],
    stageId: "rf-intake",
    status: "succeeded",
    to: [8, 40],
    tokens: 4200,
    toolCalls: [
      { latency: "320ms", name: "orders.lookup", ok: true },
      { latency: "410ms", name: "kb.search", ok: true },
    ],
  },
  {
    costUsd: 0.009,
    from: [8, 40],
    stageId: "rf-policy",
    status: "succeeded",
    to: [9, 0],
    tokens: 1800,
    toolCalls: [{ latency: "280ms", name: "policies.refunds.check", ok: true }],
  },
  {
    costUsd: 0,
    error: {
      detail:
        "Finance did not respond inside the 45 minute window, so the request was re-routed to the Ops Desk.",
      title: "Approval expired",
    },
    from: [9, 0],
    note: "First request expired unanswered.",
    stageId: "rf-approval",
    status: "failed",
    to: [9, 45],
    tokens: 0,
    toolCalls: [],
  },
  {
    costUsd: 0,
    from: [9, 45],
    note: "Re-routed to the Ops Desk and signed off.",
    stageId: "rf-approval",
    status: "succeeded",
    to: [10, 30],
    tokens: 0,
    toolCalls: [],
  },
  {
    attempt: 1,
    attempts: 3,
    costUsd: 0.004,
    error: {
      detail: "The issuer returned 402 card_declined on the original method.",
      title: "Card declined",
    },
    from: [10, 30],
    stageId: "rf-capture",
    status: "failed",
    to: [11, 0],
    tokens: 900,
    toolCalls: [
      { latency: "30.0s", name: "payments.refunds.create", ok: false },
    ],
  },
  {
    attempt: 2,
    attempts: 3,
    costUsd: 0.004,
    error: {
      detail: "Same issuer response. The backoff is shorter than the timeout.",
      title: "Card declined",
    },
    from: [10, 40],
    note: "Fired before attempt 1 timed out.",
    stageId: "rf-capture",
    status: "failed",
    to: [11, 10],
    tokens: 900,
    toolCalls: [
      { latency: "30.0s", name: "payments.refunds.create", ok: false },
    ],
  },
  {
    attempt: 3,
    attempts: 3,
    costUsd: 0.004,
    error: {
      detail: "Attempt 3 of 3 failed. The stage needs a new payment method.",
      title: "Retry budget spent",
    },
    from: [10, 50],
    note: "Three attempts in flight at once.",
    stageId: "rf-capture",
    status: "failed",
    to: [11, 20],
    tokens: 900,
    toolCalls: [
      { latency: "30.0s", name: "payments.refunds.create", ok: false },
      { latency: "640ms", name: "stripe.charges.list", ok: true },
    ],
  },
  {
    costUsd: 0.013,
    from: [11, 20],
    stageId: "rf-notify",
    status: "queued",
    to: [12, 0],
    tokens: 2600,
    toolCalls: [{ latency: "510ms", name: "sendgrid.mail.draft", ok: true }],
  },

  // Contract Ingest: the fan out
  {
    costUsd: 0.003,
    from: [9, 0],
    stageId: "ci-fetch",
    status: "succeeded",
    to: [9, 30],
    tokens: 600,
    toolCalls: [{ latency: "1.4s", name: "files.archive", ok: true }],
  },
  {
    costUsd: 0.107,
    from: [9, 30],
    shard: 1,
    shards: 3,
    stageId: "ci-parse",
    status: "succeeded",
    to: [10, 30],
    tokens: 21_400,
    toolCalls: [{ latency: "880ms", name: "postgres.query", ok: true }],
  },
  {
    costUsd: 0.124,
    from: [9, 30],
    shard: 2,
    shards: 3,
    stageId: "ci-parse",
    status: "succeeded",
    to: [10, 50],
    tokens: 24_800,
    toolCalls: [{ latency: "910ms", name: "postgres.query", ok: true }],
  },
  {
    costUsd: 0.131,
    from: [9, 30],
    note: "The long tail shard holds the whole batch open.",
    shard: 3,
    shards: 3,
    stageId: "ci-parse",
    status: "running",
    to: [11, 35],
    tokens: 26_100,
    toolCalls: [{ latency: "1.2s", name: "postgres.query", ok: true }],
  },
  {
    costUsd: 0.092,
    from: [11, 35],
    stageId: "ci-summarize",
    status: "queued",
    to: [12, 30],
    tokens: 18_400,
    toolCalls: [{ latency: "430ms", name: "kb.search", ok: true }],
  },
  {
    costUsd: 0,
    from: [12, 30],
    stageId: "ci-review",
    status: "queued",
    to: [13, 30],
    tokens: 0,
    toolCalls: [],
  },

  // Data Steward Sweep: the frozen compliance window
  {
    costUsd: 0.002,
    from: [7, 30],
    stageId: "ds-snapshot",
    status: "succeeded",
    to: [8, 15],
    tokens: 300,
    toolCalls: [{ latency: "2.1s", name: "postgres.query", ok: true }],
  },
  {
    costUsd: 0.243,
    from: [8, 15],
    stageId: "ds-dedupe",
    status: "succeeded",
    to: [11, 0],
    tokens: 48_600,
    toolCalls: [
      { latency: "620ms", name: "crm.contacts.read", ok: true },
      { latency: "740ms", name: "crm.contacts.update", ok: true },
    ],
  },
  {
    costUsd: 0,
    from: [14, 0],
    frozen: true,
    note: "Audited deletion window. The slot is fixed.",
    stageId: "ds-purge",
    // parked on an external gate rather than merely next in line: the deletion
    // may not run until its audited window opens
    status: "waiting",
    to: [15, 30],
    tokens: 0,
    toolCalls: [{ latency: "4.8s", name: "db.purge", ok: true }],
  },
  {
    costUsd: 0.061,
    from: [15, 30],
    stageId: "ds-reindex",
    status: "queued",
    to: [17, 0],
    tokens: 12_200,
    toolCalls: [{ latency: "6.1s", name: "embeddings.rebuild", ok: true }],
  },

  // Nightly Evaluation: finished overnight, collapsed on open
  {
    costUsd: 0.006,
    from: [1, 0],
    stageId: "ev-build",
    status: "succeeded",
    to: [1, 30],
    tokens: 1100,
    toolCalls: [{ latency: "380ms", name: "kb.search", ok: true }],
  },
  {
    costUsd: 0.482,
    from: [1, 30],
    stageId: "ev-run",
    status: "succeeded",
    to: [4, 20],
    tokens: 96_400,
    toolCalls: [{ latency: "1.9s", name: "pinecone.search", ok: true }],
  },
  {
    costUsd: 0.017,
    from: [4, 20],
    stageId: "ev-publish",
    status: "succeeded",
    to: [4, 45],
    tokens: 3400,
    toolCalls: [{ latency: "700ms", name: "files.archive", ok: true }],
  },
];

/**
 * One rule instead of 22 hand set values: a finished stage is full, a parked one
 * is empty, and a running one fills to exactly how much of it has elapsed
 * against the demo clock.
 */
function progressFor(
  status: StageStatus,
  startMin: number,
  endMin: number
): number {
  if (status === "succeeded" || status === "failed") {
    return 100;
  }
  if (status !== "running") {
    return 0;
  }
  const span = endMin - startMin;
  if (span <= 0) {
    return 0;
  }
  const elapsed = Math.min(Math.max(DEMO_NOW_MIN - startMin, 0), span);
  return Math.round((elapsed / span) * 100);
}

/** Deterministic bars on the anchor day. Color is derived in the view, not here. */
function buildStageBars(anchor: Date): StageBar[] {
  const at = (hour: number, minute: number) => {
    const date = new Date(anchor);
    date.setHours(hour, minute, 0, 0);
    return date;
  };
  return BAR_SEEDS.map((seed, index) => {
    const stage = STAGE_BY_ID.get(seed.stageId);
    const workflow = WORKFLOW_BY_STAGE.get(seed.stageId);
    const startMin = seed.from[0] * 60 + seed.from[1];
    const endMin = seed.to[0] * 60 + seed.to[1];
    return {
      allDay: false,
      data: {
        attempt: seed.attempt,
        attempts: seed.attempts,
        costUsd: seed.costUsd,
        error: seed.error,
        frozen: seed.frozen,
        kind: stage?.kind ?? "tool",
        note: seed.note,
        runner: stage?.runner ?? "",
        shard: seed.shard,
        shards: seed.shards,
        stageId: seed.stageId,
        status: seed.status,
        tokens: seed.tokens,
        toolCalls: seed.toolCalls,
        workflowId: workflow?.id ?? "",
      },
      end: at(seed.to[0], seed.to[1]),
      // The seed index, never the attempt or shard number: a stage row may hold
      // several bars that are neither (the gate holds two approval requests),
      // and two bars sharing an id collapse onto one window the first time the
      // board merges an update back by id.
      id: `stage-${seed.stageId}-${index + 1}`,
      // a later bar in the same row paints over an earlier one only if it says so
      priority: index,
      progress: progressFor(seed.status, startMin, endMin),
      readOnly: seed.frozen ?? false,
      resourceId: seed.stageId,
      start: at(seed.from[0], seed.from[1]),
      title: stage?.title ?? seed.stageId,
    };
  });
}

export type {
  StageBar,
  StageData,
  StageKind,
  StageMeta,
  StageStatus,
  ToolCall,
  WorkflowMeta,
};
export {
  ALL_STAGES,
  APPROVERS,
  buildStageBars,
  COLLAPSED_ON_OPEN,
  DEMO_NOW_MIN,
  KIND_LABEL,
  STAGE_BY_ID,
  STAGE_EDGES,
  STAGE_STATUSES,
  STATUS_COLOR,
  STATUS_DOT,
  STATUS_LABEL,
  STATUS_TEXT,
  WORKFLOW_BY_ID,
  WORKFLOW_BY_STAGE,
  WORKFLOW_TREE,
  WORKFLOWS,
};
