export type EisenhowerQuadrant = "do" | "schedule" | "delegate" | "eliminate";

export interface EisenhowerClassification {
  important: boolean;
  quadrant: EisenhowerQuadrant;
  reason: string;
  urgent: boolean;
}

const IMPORTANT_KEYWORD_RE =
  /\b(important|importante|prioridade|priority|p0|p1|crítica|critica|critical|key result|okr|bloqueante|blocker|ceo|board)\b/i;

const UNIMPORTANT_KEYWORD_RE =
  /\b(nice.?to.?have|opcional|optional|backlog|someday|low.?priority|baixa prioridade|trivia)\b/i;

const URGENT_KEYWORD_RE =
  /\b(urgent|urgente|asap|hoje|today|agora|immediate|deadline|prazo|amanhã|amanha|tomorrow)\b/i;

function resolveImportant(input: {
  important?: boolean;
  hasHighPriorityLabel?: boolean;
  keywordImportant: boolean;
  keywordUnimportant: boolean;
}): boolean {
  if (input.important !== undefined) {
    return input.important;
  }
  if (input.hasHighPriorityLabel) {
    return true;
  }
  if (input.keywordImportant) {
    return true;
  }
  if (input.keywordUnimportant) {
    return false;
  }
  return false;
}

function resolveUrgent(input: {
  urgent?: boolean;
  hasUrgentLabel?: boolean;
  overdue: boolean;
  dueUrgent: boolean;
  keywordUrgent: boolean;
}): boolean {
  if (input.urgent !== undefined) {
    return input.urgent;
  }
  if (input.hasUrgentLabel) {
    return true;
  }
  return input.overdue || input.dueUrgent || input.keywordUrgent;
}

function buildReason(parts: string[]): string {
  return parts.length > 0 ? parts.join(", ") : "heurística padrão";
}

function pickQuadrant(urgent: boolean, important: boolean): EisenhowerQuadrant {
  if (urgent && important) {
    return "do";
  }
  if (!urgent && important) {
    return "schedule";
  }
  if (urgent && !important) {
    return "delegate";
  }
  return "eliminate";
}

export function classifyEisenhower(input: {
  important?: boolean;
  urgent?: boolean;
  dueWithinHours?: number | null;
  hasHighPriorityLabel?: boolean;
  hasUrgentLabel?: boolean;
  name?: string;
  desc?: string;
}): EisenhowerClassification {
  const haystack = `${input.name ?? ""} ${input.desc ?? ""}`;
  const dueHours = input.dueWithinHours;
  const dueUrgent =
    dueHours !== null && dueHours !== undefined && dueHours <= 48;
  const overdue = dueHours !== null && dueHours !== undefined && dueHours < 0;
  const keywordUrgent = URGENT_KEYWORD_RE.test(haystack);
  const keywordImportant = IMPORTANT_KEYWORD_RE.test(haystack);
  const keywordUnimportant = UNIMPORTANT_KEYWORD_RE.test(haystack);

  const urgent = resolveUrgent({
    dueUrgent,
    hasUrgentLabel: input.hasUrgentLabel,
    keywordUrgent,
    overdue,
    urgent: input.urgent,
  });
  const important = resolveImportant({
    hasHighPriorityLabel: input.hasHighPriorityLabel,
    important: input.important,
    keywordImportant,
    keywordUnimportant,
  });

  const reasons: string[] = [];
  if (overdue) {
    reasons.push("atrasada");
  } else if (dueUrgent) {
    reasons.push("vence em ≤48h");
  }
  if (input.hasUrgentLabel || keywordUrgent) {
    reasons.push("sinal de urgência");
  }
  if (input.hasHighPriorityLabel || keywordImportant) {
    reasons.push("sinal de importância");
  }
  if (keywordUnimportant) {
    reasons.push("baixa prioridade no texto");
  }

  return {
    important,
    quadrant: pickQuadrant(urgent, important),
    reason: buildReason(reasons),
    urgent,
  };
}

const QUADRANT_LABELS: Record<EisenhowerQuadrant, string> = {
  delegate: "Urgente (Delegar)",
  do: "Urgente + Importante (Fazer)",
  eliminate: "Nem urgente nem importante (Eliminar)",
  schedule: "Importante (Agendar)",
};

const QUADRANT_LABELS_SHORT: Record<EisenhowerQuadrant, string> = {
  delegate: "Delegar",
  do: "Fazer",
  eliminate: "Eliminar",
  schedule: "Agendar",
};

export function quadrantLabel(quadrant: EisenhowerQuadrant): string {
  return QUADRANT_LABELS[quadrant];
}

export function quadrantLabelShort(quadrant: EisenhowerQuadrant): string {
  return QUADRANT_LABELS_SHORT[quadrant];
}

/** Trello label names used when syncing classification onto boards. */
export const EISENHOWER_TRELLO_LABELS: Record<
  EisenhowerQuadrant,
  { color: string; name: string }
> = {
  delegate: { color: "orange", name: "POS: Delegar" },
  do: { color: "red", name: "POS: Fazer" },
  eliminate: { color: "sky", name: "POS: Eliminar" },
  schedule: { color: "green", name: "POS: Agendar" },
};
