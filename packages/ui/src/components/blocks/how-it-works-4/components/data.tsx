import { GoogleCalendar } from "@personal-os/ui/components/svgs/googleCalendar";
import { Notion } from "@personal-os/ui/components/svgs/notion";
import { Trello } from "@personal-os/ui/components/svgs/trello";
import { Gemini } from "@personal-os/ui/components/ui/svgs/gemini";
import { N8n } from "@personal-os/ui/components/ui/svgs/n8n";
import { Slack } from "@personal-os/ui/components/ui/svgs/slack";
import { Supabase } from "@personal-os/ui/components/ui/svgs/supabase";
import {
  BellIcon,
  BookOpenIcon,
  CalendarIcon,
  Columns3Icon,
  DownloadIcon,
  KanbanIcon,
  KeyRoundIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  MessageSquareIcon,
  NotebookPenIcon,
  PlugZapIcon,
  RefreshCwIcon,
  SearchIcon,
  Settings2Icon,
  SettingsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TimerIcon,
  UploadIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export interface Step {
  description: string;
  /** The one lit sidebar row, top level or branch, so the frame answers the step. */
  navId: string;
  /** The numeral in the chip. Written out, so the order is never implied. */
  number: string;
  panelCaption: string;
  /** The console screen this step opens: its own name in the app, not the step's. */
  panelTitle: string;
  title: string;
  value: string;
}

/** Order drives the step cells, the console view and the sidebar highlight. */
export const STEPS: Step[] = [
  {
    description: "KPIs, prioridades e o que o operador já moveu.",
    navId: "overview",
    number: "1",
    panelCaption: "O estado do seu sistema operacional pessoal.",
    panelTitle: "Painel",
    title: "Visão do dia",
    value: "set-up",
  },
  {
    description: "Tarefas, agenda, notas e o operador num só lugar.",
    navId: "components",
    number: "2",
    panelCaption: "Peças que o PersonalOS orquestra por você.",
    panelTitle: "Módulos",
    title: "Módulos",
    value: "pick",
  },
  {
    description: "Peça foco, priorização e planejamento em linguagem natural.",
    navId: "application",
    number: "3",
    panelCaption: "Comandos que o operador executa no seu contexto.",
    panelTitle: "Ações",
    title: "Operador",
    value: "add",
  },
];

// #region Console chrome
export interface Crumb {
  /** Only the workspace crumb carries a colour chip in the design. */
  dotClassName?: string;
  id: string;
  label: string;
}

export const BREADCRUMB: Crumb[] = [
  { dotClassName: "bg-sky-500", id: "org", label: "PersonalOS" },
  { id: "workspace", label: "Workspace" },
  { id: "env", label: "Ao vivo" },
];

export interface NavItem {
  expandable?: boolean;
  /** Blocks is the one open branch. */
  expanded?: boolean;
  icon: ReactNode;
  id: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    icon: <LayoutDashboardIcon aria-hidden="true" className="size-4" />,
    id: "overview",
    label: "Painel",
  },
  {
    expandable: true,
    expanded: true,
    icon: <KanbanIcon aria-hidden="true" className="size-4" />,
    id: "blocks",
    label: "Tarefas",
  },
  {
    expandable: true,
    icon: <CalendarIcon aria-hidden="true" className="size-4" />,
    id: "components",
    label: "Agenda",
  },
  {
    expandable: true,
    icon: <NotebookPenIcon aria-hidden="true" className="size-4" />,
    id: "templates",
    label: "Notas",
  },
  {
    icon: <SparklesIcon aria-hidden="true" className="size-4" />,
    id: "analytics",
    label: "Operador",
  },
  {
    icon: <SettingsIcon aria-hidden="true" className="size-4" />,
    id: "settings",
    label: "Integrações",
  },
];

export const BLOCK_SUB_ITEMS = [
  { id: "marketing", label: "Boards" },
  { id: "application", label: "Eisenhower" },
  { id: "ecommerce", label: "Inbox" },
];
// #endregion

// #region Components workspace
export interface ComponentGroup {
  accent: string;
  blurb: string;
  count: number;
  icon: ReactNode;
  id: string;
  installs: string;
  name: string;
  tag: string | null;
}

export const COMPONENT_GROUPS: ComponentGroup[] = [
  {
    accent: "text-sky-500",
    blurb: "Kanban, Gantt e filtros.",
    count: 24,
    icon: <KanbanIcon aria-hidden="true" className="size-4" />,
    id: "tasks",
    installs: "Trello",
    name: "Tarefas",
    tag: "Core",
  },
  {
    accent: "text-teal-500",
    blurb: "Blocos de foco e reuniões.",
    count: 16,
    icon: <CalendarIcon aria-hidden="true" className="size-4" />,
    id: "calendar",
    installs: "GCal",
    name: "Agenda",
    tag: "Core",
  },
  {
    accent: "text-emerald-500",
    blurb: "Base de conhecimento indexada.",
    count: 12,
    icon: <NotebookPenIcon aria-hidden="true" className="size-4" />,
    id: "notes",
    installs: "Notion",
    name: "Notas",
    tag: null,
  },
  {
    accent: "text-amber-500",
    blurb: "Prioriza e planeja com IA.",
    count: 9,
    icon: <SparklesIcon aria-hidden="true" className="size-4" />,
    id: "operator",
    installs: "⌘K",
    name: "Operador",
    tag: "Novo",
  },
  {
    accent: "text-violet-500",
    blurb: "Ciclos pomodoro e pausas.",
    count: 8,
    icon: <TimerIcon aria-hidden="true" className="size-4" />,
    id: "focus",
    installs: "Timer",
    name: "Foco",
    tag: null,
  },
  {
    accent: "text-rose-500",
    blurb: "Lembretes e mudanças de board.",
    count: 6,
    icon: <BellIcon aria-hidden="true" className="size-4" />,
    id: "alerts",
    installs: "Inbox",
    name: "Alertas",
    tag: null,
  },
  {
    accent: "text-sky-500",
    blurb: "Comando unificado no workspace.",
    count: 5,
    icon: <SearchIcon aria-hidden="true" className="size-4" />,
    id: "search",
    installs: "⌘K",
    name: "Busca",
    tag: null,
  },
  {
    accent: "text-violet-500",
    blurb: "Thread com o operador.",
    count: 7,
    icon: <MessageSquareIcon aria-hidden="true" className="size-4" />,
    id: "chat",
    installs: "IA",
    name: "Chat",
    tag: "Novo",
  },
  {
    accent: "text-amber-500",
    blurb: "Arquivos ligados a tarefas.",
    count: 4,
    icon: <DownloadIcon aria-hidden="true" className="size-4" />,
    id: "uploads",
    installs: "Drive",
    name: "Anexos",
    tag: null,
  },
  {
    accent: "text-neutral-500",
    blurb: "KPIs do dia e da semana.",
    count: 11,
    icon: <LayoutGridIcon aria-hidden="true" className="size-4" />,
    id: "grid",
    installs: "Painel",
    name: "Overview",
    tag: null,
  },
  {
    accent: "text-emerald-500",
    blurb: "Timezone, foco e pausas.",
    count: 10,
    icon: <Settings2Icon aria-hidden="true" className="size-4" />,
    id: "prefs",
    installs: "Prefs",
    name: "Ritmo",
    tag: null,
  },
  {
    accent: "text-rose-500",
    blurb: "Magic link e sessões seguras.",
    count: 3,
    icon: <ShieldCheckIcon aria-hidden="true" className="size-4" />,
    id: "auth",
    installs: "OAuth",
    name: "Auth",
    tag: null,
  },
];
// #endregion

// #region Overview: registry KPIs
export interface Kpi {
  caption: string;
  delta: string;
  deltaClassName: string;
  icon: ReactNode;
  id: string;
  label: string;
  rising: boolean;
  /** Tinted icon tile, one hue per metric so the strip reads as five subjects. */
  tileClassName: string;
  value: string;
}

/** A registry in growth reads all-green, so the delta chip is shared. */
const KPI_UP =
  "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300";

export const KPIS: Kpi[] = [
  {
    caption: "ativas no board",
    delta: "+4",
    deltaClassName: KPI_UP,
    icon: <KanbanIcon aria-hidden="true" className="size-4" />,
    id: "tasks",
    label: "Tarefas",
    rising: true,
    tileClassName: "text-sky-500",
    value: "18",
  },
  {
    caption: "blocos hoje",
    delta: "+1",
    deltaClassName: KPI_UP,
    icon: <TimerIcon aria-hidden="true" className="size-4" />,
    id: "focus",
    label: "Foco",
    rising: true,
    tileClassName: "text-teal-500",
    value: "3",
  },
  {
    caption: "indexadas",
    delta: "+6",
    deltaClassName: KPI_UP,
    icon: <NotebookPenIcon aria-hidden="true" className="size-4" />,
    id: "notes",
    label: "Notas",
    rising: true,
    tileClassName: "text-emerald-500",
    value: "42",
  },
  {
    caption: "conectados",
    delta: "+1",
    deltaClassName: KPI_UP,
    icon: <PlugZapIcon aria-hidden="true" className="size-4" />,
    id: "integrations",
    label: "Links",
    rising: true,
    tileClassName: "text-amber-500",
    value: "3",
  },
  {
    caption: "do operador",
    delta: "+9",
    deltaClassName: KPI_UP,
    icon: <SparklesIcon aria-hidden="true" className="size-4" />,
    id: "operator",
    label: "Ações",
    rising: true,
    tileClassName: "text-violet-500",
    value: "27",
  },
];
// #endregion

// #region Overview: trending blocks
export type BlockStatus = "trending" | "stable" | "updated" | "new";

export interface TrendingBlock {
  /** Tints the block's category tile. */
  accent: string;
  category: string;
  icon: ReactNode;
  id: string;
  installs: string;
  name: string;
  note: string;
  /** Share of the top block's installs, and what the bar is drawn to. */
  popularity: number;
  status: BlockStatus;
  uses: string;
  version: string;
}

export const TRENDING_BLOCKS: TrendingBlock[] = [
  {
    accent: "text-sky-500",
    category: "Home",
    icon: <LayoutDashboardIcon aria-hidden="true" className="size-4" />,
    id: "eisenhower",
    installs: "12",
    name: "Matriz Eisenhower",
    note: "Só na Home",
    popularity: 100,
    status: "trending",
    uses: "4",
    version: "Auto",
  },
  {
    accent: "text-teal-500",
    category: "Agenda",
    icon: <TimerIcon aria-hidden="true" className="size-4" />,
    id: "focus-block",
    installs: "3",
    name: "Bloco de foco",
    note: "14:00–14:50",
    popularity: 80,
    status: "stable",
    uses: "3",
    version: "Timer",
  },
  {
    accent: "text-emerald-500",
    category: "Notas",
    icon: <NotebookPenIcon aria-hidden="true" className="size-4" />,
    id: "weekly-review",
    installs: "1",
    name: "Revisão semanal",
    note: "Atualizada",
    popularity: 66,
    status: "updated",
    uses: "1",
    version: "Notion",
  },
  {
    accent: "text-amber-500",
    category: "Operador",
    icon: <SparklesIcon aria-hidden="true" className="size-4" />,
    id: "plan-day",
    installs: "8",
    name: "Planejar o dia",
    note: "Sugestão nova",
    popularity: 52,
    status: "new",
    uses: "8",
    version: "IA",
  },
  {
    accent: "text-rose-500",
    category: "Agenda",
    icon: <CalendarIcon aria-hidden="true" className="size-4" />,
    id: "standup",
    installs: "1",
    name: "Standup sync",
    note: "Amanhã 9:30",
    popularity: 43,
    status: "stable",
    uses: "1",
    version: "GCal",
  },
  {
    accent: "text-sky-500",
    category: "Tarefas",
    icon: <LayersIcon aria-hidden="true" className="size-4" />,
    id: "inbox-zero",
    installs: "5",
    name: "Inbox zero",
    note: "Em andamento",
    popularity: 34,
    status: "new",
    uses: "5",
    version: "Board",
  },
];

/** One typed map so a status can never pick up a neighbouring row's colour. */
export const BLOCK_STATUS: Record<
  BlockStatus,
  { label: string; badgeClassName: string; indicatorClassName: string }
> = {
  new: {
    badgeClassName:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300",
    indicatorClassName: "[&_[data-slot=progress-indicator]]:bg-sky-500",
    label: "Novo",
  },
  stable: {
    badgeClassName:
      "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    indicatorClassName: "[&_[data-slot=progress-indicator]]:bg-neutral-400",
    label: "Estável",
  },
  trending: {
    badgeClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
    indicatorClassName: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
    label: "Prioridade",
  },
  updated: {
    badgeClassName:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-300",
    indicatorClassName: "[&_[data-slot=progress-indicator]]:bg-violet-500",
    label: "Atualizado",
  },
};
// #endregion

// #region Overview: recent activity
export interface ActivityItem {
  action: string;
  icon: ReactNode;
  id: string;
  /** The freshest event pulses rather than sitting still. */
  live?: boolean;
  meta: string;
  tileClassName: string;
  title: string;
}

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    action: "Ver",
    icon: <SparklesIcon aria-hidden="true" className="size-4" />,
    id: "ship",
    live: true,
    meta: "agora",
    tileClassName: "text-emerald-500",
    title: "Operador priorizou 4 cards",
  },
  {
    action: "Agenda",
    icon: <CalendarIcon aria-hidden="true" className="size-4" />,
    id: "bump",
    meta: "hoje",
    tileClassName: "text-teal-500",
    title: "Bloco de foco agendado",
  },
  {
    action: "Abrir",
    icon: <PlugZapIcon aria-hidden="true" className="size-4" />,
    id: "mcp",
    meta: "board Principal",
    tileClassName: "text-sky-500",
    title: "Trello sincronizado",
  },
  {
    action: "Ler",
    icon: <BookOpenIcon aria-hidden="true" className="size-4" />,
    id: "template",
    meta: "Notion",
    tileClassName: "text-emerald-500",
    title: "Nota de projeto indexada",
  },
  {
    action: "Editar",
    icon: <Settings2Icon aria-hidden="true" className="size-4" />,
    id: "docs",
    meta: "atualizadas",
    tileClassName: "text-amber-500",
    title: "Preferências de ritmo",
  },
  {
    action: "Detalhes",
    icon: <RefreshCwIcon aria-hidden="true" className="size-4" />,
    id: "sync",
    meta: "há 2 min",
    tileClassName: "text-neutral-500",
    title: "Calendar sync ok",
  },
];
// #endregion

// #region Overview: installs chart

// cli + mcp installs stack into the day's total; target draws over them. All raw
// counts, so the header totals are real sums.
export const INSTALL_DAYS = [
  { cli: 4, id: "d01", mcp: 2, target: 5 },
  { cli: 5, id: "d02", mcp: 1, target: 6 },
  { cli: 3, id: "d03", mcp: 3, target: 5 },
  { cli: 6, id: "d04", mcp: 2, target: 7 },
  { cli: 4, id: "d05", mcp: 4, target: 6 },
  { cli: 2, id: "d06", mcp: 1, target: 4 },
  { cli: 1, id: "d07", mcp: 1, target: 3 },
  { cli: 5, id: "d08", mcp: 2, target: 6 },
  { cli: 7, id: "d09", mcp: 1, target: 7 },
  { cli: 6, id: "d10", mcp: 3, target: 8 },
  { cli: 4, id: "d11", mcp: 2, target: 5 },
  { cli: 5, id: "d12", mcp: 2, target: 6 },
  { cli: 3, id: "d13", mcp: 3, target: 5 },
  { cli: 2, id: "d14", mcp: 2, target: 4 },
  { cli: 6, id: "d15", mcp: 1, target: 6 },
  { cli: 8, id: "d16", mcp: 2, target: 8 },
  { cli: 7, id: "d17", mcp: 3, target: 9 },
  { cli: 5, id: "d18", mcp: 2, target: 6 },
  { cli: 4, id: "d19", mcp: 2, target: 5 },
  { cli: 3, id: "d20", mcp: 3, target: 5 },
  { cli: 2, id: "d21", mcp: 2, target: 4 },
];

export const INSTALL_TICKS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];
// #endregion

// #region Install workspace
export interface CliItem {
  /** Shown verbatim in a mono chip, so it stays copyable by eye. */
  command: string;
  icon: ReactNode;
  id: string;
  installs: string;
  name: string;
  status: string;
  statusClassName: string;
  summary: string;
}

export const CLI_ITEMS: CliItem[] = [
  {
    command: "priorizar meu board",
    icon: <KanbanIcon aria-hidden="true" />,
    id: "prioritize",
    installs: "12 usos",
    name: "Priorizar",
    status: "Pronto",
    statusClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
    summary: "Classifica na matriz Eisenhower da Home",
  },
  {
    command: "planejar meu dia",
    icon: <CalendarIcon aria-hidden="true" />,
    id: "plan-day",
    installs: "9 usos",
    name: "Planejar o dia",
    status: "Pronto",
    statusClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
    summary: "Monta blocos de foco na agenda",
  },
  {
    command: "começar bloco de 50 min",
    icon: <TimerIcon aria-hidden="true" />,
    id: "focus",
    installs: "18 usos",
    name: "Iniciar foco",
    status: "Pronto",
    statusClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
    summary: "Timer com pausa configurada",
  },
  {
    command: "resumir notas do projeto",
    icon: <NotebookPenIcon aria-hidden="true" />,
    id: "summarize",
    installs: "6 usos",
    name: "Resumir notas",
    status: "Pronto",
    statusClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
    summary: "Síntese a partir do Notion",
  },
  {
    command: "sincronizar integrações",
    icon: <RefreshCwIcon aria-hidden="true" />,
    id: "sync",
    installs: "4 usos",
    name: "Sincronizar",
    status: "Beta",
    statusClassName:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300",
    summary: "Puxa Trello, Calendar e Notion",
  },
  {
    command: "triagem da inbox",
    icon: <Columns3Icon aria-hidden="true" />,
    id: "inbox",
    installs: "7 usos",
    name: "Triagem",
    status: "Beta",
    statusClassName:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300",
    summary: "Classifica e sugere próximos passos",
  },
  {
    command: "buscar contexto sobre X",
    icon: <SearchIcon aria-hidden="true" />,
    id: "search",
    installs: "15 usos",
    name: "Buscar",
    status: "Pronto",
    statusClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
    summary: "Busca unificada no workspace",
  },
  {
    command: "capturar ideia rápida",
    icon: <UploadIcon aria-hidden="true" />,
    id: "capture",
    installs: "11 usos",
    name: "Capturar",
    status: "Novo",
    statusClassName:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300",
    summary: "Salva na inbox sem fricção",
  },
  {
    command: "briefing da manhã",
    icon: <BellIcon aria-hidden="true" />,
    id: "brief",
    installs: "5 usos",
    name: "Briefing",
    status: "Novo",
    statusClassName:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300",
    summary: "Resumo do dia e prioridades",
  },
];
// #endregion

// #region Integrations workspace
export interface Integration {
  connected: boolean;
  description: string;
  id: string;
  logo: ReactNode;
}

export const INTEGRATIONS: Integration[] = [
  {
    connected: true,
    description: "Boards, cards e prioridades no seu ritmo.",
    id: "trello",
    logo: <Trello className="size-6" />,
  },
  {
    connected: true,
    description: "Agenda, blocos de foco e lembretes sincronizados.",
    id: "google-calendar",
    logo: <GoogleCalendar className="size-6" />,
  },
  {
    connected: false,
    description: "Notas e base de conhecimento para o operador.",
    id: "notion",
    logo: <Notion className="size-6" />,
  },
  {
    connected: false,
    description: "Alertas e aprovações nos seus canais.",
    id: "slack",
    logo: <Slack className="size-6" />,
  },
  {
    connected: true,
    description: "Modelo de IA para planejamento e síntese.",
    id: "gemini",
    logo: <Gemini className="size-6" />,
  },
  {
    connected: false,
    description: "Automações que disparam a partir do workspace.",
    id: "n8n",
    logo: <N8n className="size-6" />,
  },
  {
    connected: true,
    description: "Preferências e sessão do PersonalOS.",
    id: "supabase",
    logo: <Supabase className="size-6" />,
  },
  {
    connected: true,
    description: "Magic link e OAuth sem colar tokens.",
    id: "auth",
    logo: <KeyRoundIcon aria-hidden="true" className="size-6" />,
  },
];
// #endregion
