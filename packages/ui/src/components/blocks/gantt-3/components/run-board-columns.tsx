import type { GanttColumn } from "@personal-os/ui/components/reui/gantt/gantt";

import { STAGE_BY_ID, type StageStatus } from "./data";
import {
  RowActionsMenu,
  SlackCell,
  StatusCell,
  TokensCell,
  WaitsForCell,
} from "./run-board-cells";
import type { StageSlack } from "./schedule";

/** What every row of the tree panel reads from. Computed once, never per cell. */
interface RowFacts {
  slack: StageSlack | null;
  status: StageStatus;
  tokens: number;
  waitsFor: string | null;
}

/** Column ids in the order the header lays them out. */
const COLUMN_IDS = ["status", "waits", "slack", "tokens"] as const;

/**
 * Status and Slack answer the two questions an operator opens the board with.
 * Waits For and Tokens are follow-ups, so they start hidden behind the columns
 * menu and give their width back to the timeline.
 */
const DEFAULT_COLUMNS: string[] = ["status", "slack"];

/** The one place a column is named; the columns menu reads this too. */
const COLUMN_LABELS: Record<string, string> = {
  slack: "Slack",
  status: "Status",
  tokens: "Tokens",
  waits: "Waits For",
};

function buildStageColumns({
  visible,
  facts,
  onOpen,
  onRerun,
  onClear,
}: {
  visible: string[];
  facts: Map<string, RowFacts>;
  onOpen: (stageId: string) => void;
  onRerun: (stageId: string) => void;
  onClear: (stageId: string) => void;
}): GanttColumn[] {
  const defs: Record<string, GanttColumn> = {
    slack: {
      align: "end",
      id: "slack",
      render: ({ resource }) => {
        const row = facts.get(resource.id);
        return row ? <SlackCell slack={row.slack} /> : null;
      },
      title: COLUMN_LABELS.slack,
      // wide enough that "6h 30m" keeps clear of the timeline divider
      width: 92,
    },
    status: {
      id: "status",
      render: ({ resource }) => {
        const row = facts.get(resource.id);
        return row ? <StatusCell status={row.status} /> : null;
      },
      title: COLUMN_LABELS.status,
      width: 92,
    },
    tokens: {
      align: "end",
      id: "tokens",
      render: ({ resource }) => {
        const row = facts.get(resource.id);
        return row ? <TokensCell tokens={row.tokens} /> : null;
      },
      title: COLUMN_LABELS.tokens,
      width: 84,
    },
    waits: {
      id: "waits",
      render: ({ resource, isGroup }) => {
        if (isGroup) {
          return null;
        }
        const row = facts.get(resource.id);
        return row ? <WaitsForCell title={row.waitsFor} /> : null;
      },
      title: COLUMN_LABELS.waits,
      width: 120,
    },
  };

  // COLUMN_IDS drives the order, so toggling a column back on returns it to its
  // own slot rather than to the end of the row
  const columns: GanttColumn[] = [];
  for (const id of COLUMN_IDS) {
    if (!visible.includes(id)) {
      continue;
    }
    const def = defs[id];
    if (def) {
      columns.push(def);
    }
  }
  columns.push({
    id: "actions",
    render: ({ resource, isGroup }) => {
      if (isGroup) {
        return null;
      }
      const stage = STAGE_BY_ID.get(resource.id);
      if (!stage) {
        return null;
      }
      return (
        <RowActionsMenu
          onClear={onClear}
          onOpen={onOpen}
          onRerun={onRerun}
          stage={stage}
        />
      );
    },
    width: 32,
  });
  return columns;
}

export type { RowFacts };
export { buildStageColumns, COLUMN_IDS, COLUMN_LABELS, DEFAULT_COLUMNS };
