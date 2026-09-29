export type EisenhowerQuadrant = "do" | "schedule" | "delegate" | "eliminate";

export interface EisenhowerClassification {
  important: boolean;
  quadrant: EisenhowerQuadrant;
  urgent: boolean;
}

export function classifyEisenhower(input: {
  important?: boolean;
  urgent?: boolean;
  dueWithinHours?: number | null;
  hasHighPriorityLabel?: boolean;
}): EisenhowerClassification {
  const urgent =
    input.urgent ??
    (input.dueWithinHours !== null &&
      input.dueWithinHours !== undefined &&
      input.dueWithinHours <= 48);
  const important = input.important ?? input.hasHighPriorityLabel ?? false;

  if (urgent && important) {
    return { important, quadrant: "do", urgent };
  }
  if (!urgent && important) {
    return { important, quadrant: "schedule", urgent };
  }
  if (urgent && !important) {
    return { important, quadrant: "delegate", urgent };
  }
  return { important, quadrant: "eliminate", urgent };
}

export function quadrantLabel(quadrant: EisenhowerQuadrant): string {
  switch (quadrant) {
    case "do":
      return "Urgent + Important (Do)";
    case "schedule":
      return "Important + Not Urgent (Schedule)";
    case "delegate":
      return "Urgent + Not Important (Delegate)";
    case "eliminate":
      return "Not Urgent + Not Important (Eliminate)";
  }
}
