export interface TaskBoardItem {
  desc: string;
  due: string | null;
  id: string;
  listId?: string;
  name: string;
  overdue: boolean;
  quadrant?: string;
  url?: string;
}

export interface TaskBoardList {
  id: string;
  name: string;
  pos?: number;
}

export type PlanningStageId =
  | "inbox"
  | "today"
  | "scheduled"
  | "progress"
  | "done";

export const PLANNING_COLUMNS: Array<{
  description: string;
  dotClassName: string;
  id: PlanningStageId;
  title: string;
}> = [
  {
    description: "Sem data ou ainda na entrada",
    dotClassName: "bg-muted-foreground/45",
    id: "inbox",
    title: "Entrada",
  },
  {
    description: "Vencem hoje",
    dotClassName: "bg-rose-500",
    id: "today",
    title: "Hoje",
  },
  {
    description: "Com data futura",
    dotClassName: "bg-amber-500",
    id: "scheduled",
    title: "Agendadas",
  },
  {
    description: "Em execução local",
    dotClassName: "bg-sky-500",
    id: "progress",
    title: "Em progresso",
  },
  {
    description: "Concluídas neste quadro",
    dotClassName: "bg-emerald-500",
    id: "done",
    title: "Completas",
  },
];

export const QUADRANT_LABEL: Record<string, string> = {
  delegate: "Delegar",
  do: "Fazer",
  eliminate: "Eliminar",
  schedule: "Agendar",
};

export const QUADRANT_BADGE: Record<
  string,
  "destructive-light" | "info-light" | "success-light" | "warning-light"
> = {
  delegate: "info-light",
  do: "destructive-light",
  eliminate: "success-light",
  schedule: "warning-light",
};

export function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function derivePlanningStage(
  task: TaskBoardItem,
  overrides: Record<string, PlanningStageId>,
  now = new Date()
): PlanningStageId {
  const override = overrides[task.id];
  if (override) {
    return override;
  }
  if (!task.due) {
    return "inbox";
  }
  const due = new Date(task.due);
  if (isSameLocalDay(due, now)) {
    return "today";
  }
  if (due.getTime() > now.getTime()) {
    return "scheduled";
  }
  // overdue stays visible in Hoje so nothing slips the operator
  return "today";
}

export function formatDueLabel(due: string | null, now = new Date()) {
  if (!due) {
    return "Sem prazo";
  }
  const date = new Date(due);
  if (isSameLocalDay(date, now)) {
    return "Hoje";
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function eisenhowerRating(quadrant?: string): number {
  switch (quadrant) {
    case "do":
      return 5;
    case "schedule":
      return 4;
    case "delegate":
      return 3;
    case "eliminate":
      return 2;
    default:
      return 0;
  }
}
