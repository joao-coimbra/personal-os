import { addMinutes, differenceInMinutes, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export interface FocusBlockProposal {
  end: string;
  start: string;
  summary: string;
  taskId?: string;
  taskName?: string;
}

export interface PlanDayInput {
  breakMinutes: number;
  events: Array<{ end: string; start: string; summary?: string }>;
  focusMinutes: number;
  maxTasksPerDay?: number;
  targetDate: string;
  tasks: Array<{
    due?: string | null;
    id: string;
    name: string;
    quadrant?: string;
  }>;
  timezone: string;
  workEnd: string;
  workStart: string;
}

export interface PlanDayResult {
  blocks: FocusBlockProposal[];
  message?: string;
  rejectedTaskIds: string[];
}

function parseWorkTime(date: string, time: string, timezone: string): Date {
  return fromZonedTime(`${date}T${time}:00`, timezone);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function planDay(input: PlanDayInput): PlanDayResult {
  const maxTasks = input.maxTasksPerDay ?? 8;
  const priorityTasks = input.tasks
    .filter((t) => t.quadrant === "do" || t.quadrant === "schedule")
    .slice(0, maxTasks);
  const rejectedTaskIds =
    priorityTasks.length < input.tasks.length
      ? input.tasks.slice(maxTasks).map((t) => t.id)
      : [];

  const dayStart = parseWorkTime(
    input.targetDate,
    input.workStart,
    input.timezone
  );
  const dayEnd = parseWorkTime(input.targetDate, input.workEnd, input.timezone);

  const busy = input.events
    .map((e) => ({
      end: parseISO(e.end),
      start: parseISO(e.start),
    }))
    .filter((e) => e.start < dayEnd && e.end > dayStart);

  const blocks: FocusBlockProposal[] = [];
  let cursor = dayStart;

  for (const task of priorityTasks) {
    while (true) {
      const blockEnd = addMinutes(cursor, input.focusMinutes);
      if (blockEnd > dayEnd) {
        break;
      }
      const conflict = busy.some((b) =>
        overlaps(cursor, blockEnd, b.start, b.end)
      );
      if (!conflict) {
        blocks.push({
          end: formatInTimeZone(
            blockEnd,
            input.timezone,
            "yyyy-MM-dd'T'HH:mm:ssXXX"
          ),
          start: formatInTimeZone(
            cursor,
            input.timezone,
            "yyyy-MM-dd'T'HH:mm:ssXXX"
          ),
          summary: `[Focus] ${task.name}`,
          taskId: task.id,
          taskName: task.name,
        });
        cursor = addMinutes(blockEnd, input.breakMinutes);
        break;
      }
      const nextBusy = busy.find((b) =>
        overlaps(cursor, blockEnd, b.start, b.end)
      );
      if (nextBusy) {
        cursor = nextBusy.end;
      } else {
        cursor = addMinutes(cursor, 15);
      }
      if (differenceInMinutes(dayEnd, cursor) < input.focusMinutes) {
        break;
      }
    }
  }

  let message: string | undefined;
  if (rejectedTaskIds.length > 0) {
    message = `Sustainable planning: ${rejectedTaskIds.length} lower-priority tasks were not scheduled today. Consider moving them to other days.`;
  }
  if (blocks.length === 0 && priorityTasks.length > 0) {
    message =
      "No free slots found within your work hours. Try a shorter focus block or adjust your calendar.";
  }

  return { blocks, message, rejectedTaskIds };
}
