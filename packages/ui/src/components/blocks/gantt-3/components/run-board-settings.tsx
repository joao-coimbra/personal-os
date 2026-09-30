"use client";

import { Button } from "@personal-os/ui/components/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@personal-os/ui/components/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@personal-os/ui/components/popover";
import { Badge } from "@personal-os/ui/components/reui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@personal-os/ui/components/select";
import { Switch } from "@personal-os/ui/components/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@personal-os/ui/components/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@personal-os/ui/components/tooltip";
import { cn } from "cn";
import { CircleHelpIcon, Settings2Icon } from "lucide-react";
import type { ReactNode } from "react";
import {
  STAGE_STATUSES,
  STATUS_LABEL,
  type StageStatus,
  WORKFLOWS,
} from "./data";
import { StatusDot, StatusGlyph } from "./run-board-cells";

/** How much of the left pane the board gives up to the timeline. */
type TreeMode = "full" | "compact" | "hidden";

interface BoardSettings {
  criticalOnly: boolean;
  rollups: boolean;
  rowLines: boolean;
  scheduleHints: boolean;
  treeMode: TreeMode;
}

const TREE_MODES: { value: TreeMode; label: string }[] = [
  { label: "Full", value: "full" },
  { label: "Compact", value: "compact" },
  { label: "Hidden", value: "hidden" },
];

/** One source for the opening state and for what Reset View restores. */
const DEFAULT_SETTINGS: BoardSettings = {
  criticalOnly: false,
  rollups: true,
  rowLines: true,
  scheduleHints: true,
  treeMode: "full",
};

/** Compared field by field so the reset stays honest when a setting is added. */
function isDefaultView(settings: BoardSettings): boolean {
  return (
    settings.criticalOnly === DEFAULT_SETTINGS.criticalOnly &&
    settings.scheduleHints === DEFAULT_SETTINGS.scheduleHints &&
    settings.rowLines === DEFAULT_SETTINGS.rowLines &&
    settings.rollups === DEFAULT_SETTINGS.rollups &&
    settings.treeMode === DEFAULT_SETTINGS.treeMode
  );
}

/**
 * The reset each tab owns, rule included. Both appear only once that tab has
 * something to undo: a permanently disabled button is dead weight, and its
 * absence already says the tab is untouched.
 */
function ResetSection({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <>
      <FieldSeparator className="-mx-3.5" />
      <Button
        className="w-full"
        onClick={onClick}
        size="xs"
        type="button"
        variant="outline"
      >
        {label}
      </Button>
    </>
  );
}

/** Group heading inside the popover. The only heading this surface carries. */
function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-medium text-muted-foreground text-xs">{children}</div>
  );
}

/** A switch row with the reason beside it, so a toggle is never guessed at. */
function SettingRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  hint: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Field
      className="min-h-9 items-center justify-between gap-3"
      orientation="horizontal"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <FieldLabel className="font-normal text-sm" htmlFor={id}>
          {label}
        </FieldLabel>
        <Tooltip>
          <TooltipTrigger className="shrink-0 text-muted-foreground">
            <CircleHelpIcon aria-hidden="true" className="size-3.5" />
            <span className="sr-only">About {label}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-56" side="right">
            {hint}
          </TooltipContent>
        </Tooltip>
      </div>
      <Switch
        checked={checked}
        id={id}
        onCheckedChange={onCheckedChange}
        size="sm"
      />
    </Field>
  );
}

/**
 * Multi-select as pressed chips, the corpus idiom for this surface: a column of
 * checkboxes would double the popover's height for the same few choices.
 */
function FilterChip({
  active,
  glyph,
  label,
  onClick,
}: {
  active: boolean;
  glyph: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      className={cn("rounded-full", active && "border-foreground/10")}
      onClick={onClick}
      size="xs"
      type="button"
      variant={active ? "secondary" : "outline"}
    >
      {glyph}
      {label}
    </Button>
  );
}

function RunBoardSettings({
  settings,
  hiddenWorkflows,
  dimmedStatuses,
  workflowStatus,
  onChange,
  onToggleWorkflow,
  onToggleStatus,
  onResetView,
  onResetFilters,
}: {
  settings: BoardSettings;
  hiddenWorkflows: Set<string>;
  /** Pressed here means faded on the board, so the label matches the effect. */
  dimmedStatuses: Set<StageStatus>;
  workflowStatus: Map<string, StageStatus>;
  onChange: (patch: Partial<BoardSettings>) => void;
  onToggleWorkflow: (workflowId: string) => void;
  onToggleStatus: (status: StageStatus) => void;
  onResetView: () => void;
  onResetFilters: () => void;
}) {
  const activeFilters = hiddenWorkflows.size + dimmedStatuses.size;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="sm" type="button" variant="outline">
            <Settings2Icon aria-hidden="true" className="size-4" />
            <span className="max-sm:sr-only">Ajustes</span>
            {activeFilters > 0 ? (
              <Badge className="tabular-nums" radius="full">
                {activeFilters}
              </Badge>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-[320px] p-0">
        <Tabs defaultValue="view">
          <div className="px-3.5 pt-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view">View</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="m-0" value="view">
            <FieldGroup className="gap-3 px-3.5 py-3">
              <div className="space-y-2">
                <GroupLabel>Board</GroupLabel>
                <div className="space-y-0">
                  <SettingRow
                    checked={settings.criticalOnly}
                    hint="Fades every stage that still has slack, leaving the chain that decides when the run lands."
                    id="setting-critical"
                    label="Caminho crítico"
                    onCheckedChange={(checked) =>
                      onChange({ criticalOnly: checked })
                    }
                  />
                  <SettingRow
                    checked={settings.scheduleHints}
                    hint="Shows a snapped tile on empty track where a stage may legally be scheduled."
                    id="setting-hints"
                    label="Placement Hints"
                    onCheckedChange={(checked) =>
                      onChange({ scheduleHints: checked })
                    }
                  />
                  <SettingRow
                    checked={settings.rowLines}
                    hint="Draws a rule between rows. Turn it off for a lighter grid on a dense board."
                    id="setting-lines"
                    label="Row Separators"
                    onCheckedChange={(checked) =>
                      onChange({ rowLines: checked })
                    }
                  />
                  <SettingRow
                    checked={settings.rollups}
                    hint="Draws the envelope strip and completion figure on each playbook row."
                    id="setting-rollups"
                    label="Resumo dos playbooks"
                    onCheckedChange={(checked) =>
                      onChange({ rollups: checked })
                    }
                  />
                </div>
              </div>

              <FieldSeparator className="-mx-3.5" />

              <div className="space-y-2">
                <GroupLabel>Layout</GroupLabel>
                <Field
                  className="min-h-9 items-center justify-between gap-3"
                  orientation="horizontal"
                >
                  <FieldLabel
                    className="font-normal text-sm"
                    htmlFor="setting-tree"
                  >
                    Tree Panel
                  </FieldLabel>
                  <Select
                    // items is what lets SelectValue render the label rather
                    // than the raw stored value
                    items={TREE_MODES}
                    onValueChange={(value: string | null) => {
                      // narrow the string back to a known mode before storing
                      const mode = TREE_MODES.find(
                        (item) => item.value === value
                      );
                      if (mode) {
                        onChange({ treeMode: mode.value });
                      }
                    }}
                    value={settings.treeMode}
                  >
                    <SelectTrigger
                      className="w-[132px] shrink-0"
                      id="setting-tree"
                      size="sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectGroup>
                        {TREE_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {isDefaultView(settings) ? null : (
                <ResetSection label="Reset View" onClick={onResetView} />
              )}
            </FieldGroup>
          </TabsContent>

          <TabsContent className="m-0" value="filters">
            <FieldGroup className="gap-3 px-3.5 py-3">
              <div className="space-y-2.5">
                <GroupLabel>Playbooks</GroupLabel>
                {/* Hiding a playbook removes its ROWS, because a playbook is a
                  self contained graph and no edge crosses out of it. */}
                <div className="flex flex-wrap gap-1.5">
                  {WORKFLOWS.map((workflow) => {
                    const status = workflowStatus.get(workflow.id);
                    return (
                      <FilterChip
                        active={!hiddenWorkflows.has(workflow.id)}
                        glyph={status ? <StatusGlyph status={status} /> : null}
                        key={workflow.id}
                        label={workflow.title}
                        onClick={() => onToggleWorkflow(workflow.id)}
                      />
                    );
                  })}
                </div>
              </div>

              <FieldSeparator className="-mx-3.5" />

              <div className="space-y-2.5">
                <GroupLabel>Dim Status</GroupLabel>
                {/* Dimming, never hiding: a bar removed from the board takes the
                  ripple with it, and the ripple is the thing worth watching. */}
                <div className="flex flex-wrap gap-1.5">
                  {STAGE_STATUSES.map((status) => (
                    <FilterChip
                      active={dimmedStatuses.has(status)}
                      glyph={<StatusDot status={status} />}
                      key={status}
                      label={STATUS_LABEL[status]}
                      onClick={() => onToggleStatus(status)}
                    />
                  ))}
                </div>
              </div>

              {activeFilters > 0 ? (
                <ResetSection label="Reset Filters" onClick={onResetFilters} />
              ) : null}
            </FieldGroup>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export type { BoardSettings, TreeMode };
export { DEFAULT_SETTINGS, RunBoardSettings, TREE_MODES };
