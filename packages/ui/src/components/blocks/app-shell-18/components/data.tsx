import { Calendar, CircleCheck, Clock, Flag, ListChecks } from "lucide-react";
import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Brand + current user
// ─────────────────────────────────────────────────────────────────────────────

export const ORG = {
  name: "ReUI",
} as const;

export const USER = {
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
  email: "mira@reui.io",
  initials: "MS",
  name: "Mira Stone",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tag colors - categorical accents from the stock Tailwind palette, keyed so a
// tag always renders the same swatch wherever it appears (sidebar chip + task).
// ─────────────────────────────────────────────────────────────────────────────

export type TagColor = "rose" | "emerald" | "amber" | "blue" | "violet";

export const TAG_DOT: Record<TagColor, string> = {
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
};

// Swatch options surfaced in the "Add tag" dialog.
export const TAG_SWATCHES: TagColor[] = [
  "rose",
  "emerald",
  "amber",
  "blue",
  "violet",
];

export type Tag = {
  id: string;
  label: string;
  color: TagColor;
};

export const TAGS: Tag[] = [
  { color: "rose", id: "work", label: "Work" },
  { color: "emerald", id: "personal", label: "Personal" },
  { color: "amber", id: "team", label: "Team" },
  { color: "blue", id: "goals", label: "Goals" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Task lists - the primary sidebar navigation (My Lists)
// ─────────────────────────────────────────────────────────────────────────────

export type TaskListItem = {
  id: string;
  label: string;
  icon: ReactNode;
  count: number;
  isActive?: boolean;
};

export const TASK_LISTS: TaskListItem[] = [
  {
    count: 42,
    icon: <ListChecks aria-hidden="true" />,
    id: "all",
    isActive: true,
    label: "All Tasks",
  },
  {
    count: 6,
    icon: <Calendar aria-hidden="true" />,
    id: "today",
    label: "Today",
  },
  {
    count: 14,
    icon: <Clock aria-hidden="true" />,
    id: "upcoming",
    label: "Upcoming",
  },
  {
    count: 4,
    icon: <Flag aria-hidden="true" />,
    id: "priority",
    label: "Priority",
  },
  {
    count: 18,
    icon: <CircleCheck aria-hidden="true" />,
    id: "completed",
    label: "Completed",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Focus card - a single in-progress milestone shown in the sidebar footer
// ─────────────────────────────────────────────────────────────────────────────

export const FOCUS = {
  caption: "Next milestone in 3 days",
  completed: 18,
  title: "Launch Campaign",
  total: 32,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// AI assistant - suggestion prompts + a short sample exchange
// ─────────────────────────────────────────────────────────────────────────────

export const AI_SUGGESTIONS = [
  "Summarize my day",
  "Plan the week",
  "Surface blockers",
] as const;

export type AiMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

export const AI_THREAD: AiMessage[] = [
  {
    id: "m1",
    role: "assistant",
    text: "Morning, Mira. You have 6 tasks due today and 3 are high priority.",
  },
  {
    id: "m2",
    role: "user",
    text: "What should I tackle first?",
  },
  {
    id: "m3",
    role: "assistant",
    text: "Start with the launch announcement copy - it blocks two other tasks and is due at 2:00 PM.",
  },
];

// Canned assistant turns, cycled to simulate a reply for each message sent.
export const AI_REPLIES = [
  "Good call. I sketched a quick outline you can refine in the editor.",
  "Here is the order I would take: clear the high-impact items first, then batch the rest.",
  "I can split that into subtasks with owners if it helps you delegate.",
  "Done. I flagged the two items blocking others so you can clear them early.",
] as const;
