import {
  CalendarDays,
  Kanban,
  NotebookPen,
  Sparkles,
  Timer,
} from "lucide-react";
import type { ReactNode } from "react";

export type OnboardingStep = {
  id: string;
  value: number;
  label: string;
  title: string;
  description: string;
  optional?: boolean;
};

export type OnboardingChoice<TValue extends string = string> = {
  value: TValue;
  label: string;
  description: string;
  icon?: ReactNode;
  recommended?: boolean;
};

export type FocusGoalValue =
  | "prioritize"
  | "timeblock"
  | "notes"
  | "deepwork"
  | "explore";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    description:
      "Um tour rápido do painel, dos módulos e do operador — em seguida você conecta as ferramentas.",
    id: "welcome",
    label: "Bem-vindo",
    title: "Seu sistema operacional pessoal",
    value: 1,
  },
  {
    description:
      "Autorize com OAuth oficial. Você pode pular e conectar depois.",
    id: "integrations",
    label: "Integrações",
    optional: true,
    title: "Conecte suas ferramentas",
    value: 2,
  },
  {
    description: "O planner respeita horários, foco e pausas.",
    id: "preferences",
    label: "Ritmo",
    title: "Seu ritmo de trabalho",
    value: 3,
  },
  {
    description: "Escolha os fluxos que o operador deve apoiar primeiro.",
    id: "goals",
    label: "Metas",
    title: "O que você quer priorizar?",
    value: 4,
  },
  {
    description: "Depois do setup, abra o painel com ⌘K / Ctrl+K.",
    id: "ai",
    label: "Operador",
    title: "Operador de IA",
    value: 5,
  },
];

export const SIDEBAR_STEP_DESCRIPTIONS: Record<string, string> = {
  ai: "Como pedir ajuda à IA.",
  goals: "Prioridades iniciais.",
  integrations: "Trello, Calendar, Gmail e Notion.",
  preferences: "Timezone e blocos de foco.",
  welcome: "Visão geral do PersonalOS.",
};

export const TIMEZONE_GROUPS = [
  {
    items: [
      "America/Sao_Paulo",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Toronto",
    ],
    value: "Américas",
  },
  {
    items: [
      "Europe/Lisbon",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Madrid",
    ],
    value: "Europa",
  },
  {
    items: ["Asia/Tokyo", "Asia/Singapore", "Asia/Dubai", "Australia/Sydney"],
    value: "Ásia / Pacífico",
  },
] as const;

export const FOCUS_GOAL_OPTIONS: OnboardingChoice<FocusGoalValue>[] = [
  {
    description: "Urgente vs importante com o Trello.",
    icon: <Kanban aria-hidden="true" />,
    label: "Priorizar tarefas (Eisenhower)",
    recommended: true,
    value: "prioritize",
  },
  {
    description: "Blocos de foco no Google Calendar.",
    icon: <CalendarDays aria-hidden="true" />,
    label: "Time blocking na agenda",
    value: "timeblock",
  },
  {
    description: "Notion como base para o operador.",
    icon: <NotebookPen aria-hidden="true" />,
    label: "Notas e conhecimento",
    value: "notes",
  },
  {
    description: "Focus + pausas no seu horário.",
    icon: <Timer aria-hidden="true" />,
    label: "Sessões de deep work",
    value: "deepwork",
  },
  {
    description: "Setup leve; conecto depois.",
    icon: <Sparkles aria-hidden="true" />,
    label: "Só explorando",
    value: "explore",
  },
];

export const AI_PROMPT_EXAMPLES = [
  "O que tenho para fazer hoje?",
  "Organize meu dia respeitando 09–18h.",
  "Classifique minhas tarefas por urgência e importância.",
] as const;
