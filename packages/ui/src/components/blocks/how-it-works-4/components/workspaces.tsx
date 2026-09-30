"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { Item } from "@personal-os/ui/components/item";
import { Progress } from "@personal-os/ui/components/progress";
/**
 * The console views, one per step. Each takes its heading from the step it
 * answers, so the frame reads as the same product moving through the walkthrough
 * rather than four screenshots, all on the fixed neutral PANEL palette.
 * Content lives in data.tsx; layout and tone live here.
 */
import { Badge } from "@personal-os/ui/components/reui/badge";
import { IconTile } from "@personal-os/ui/components/reui/icon-tile";
import { cn } from "cn";
import {
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PlugZapIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { PANEL } from "./app-shell";
import {
  BLOCK_STATUS,
  CLI_ITEMS,
  COMPONENT_GROUPS,
  INSTALL_DAYS,
  INSTALL_TICKS,
  INTEGRATIONS,
  KPIS,
  RECENT_ACTIVITY,
  TRENDING_BLOCKS,
} from "./data";

/* Derived, so the header stats can never drift from the series under them. */
const INSTALL_TOTAL = INSTALL_DAYS.reduce(
  (total, day) => total + day.cli + day.mcp,
  0
);
const TARGET_TOTAL = INSTALL_DAYS.reduce((total, day) => total + day.target, 0);
const COMPONENT_TOTAL = COMPONENT_GROUPS.reduce(
  (total, group) => total + group.count,
  0
);
const INSTALL_GAP = INSTALL_TOTAL - TARGET_TOTAL;
const INSTALL_PEAK = Math.max(
  ...INSTALL_DAYS.map((day) => Math.max(day.cli + day.mcp, day.target))
);

/** Deterministic thousands grouping: `toLocaleString` is locale dependent. */
const group = (value: number) =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** The standby series is hatched in the design rather than filled flat. */
const HATCH =
  "bg-[repeating-linear-gradient(45deg,var(--color-teal-400)_0px,var(--color-teal-400)_2px,transparent_2px,transparent_6px)]";

// Ambient console motion: every loop settles early, holds at its resting frame,
// and is killed under prefers-reduced-motion.
export const FRAME_MOTION = `
@keyframes hiw4-grow {
  0%, 54% { transform: scaleY(1) }
  66% { transform: scaleY(0.3) }
  100% { transform: scaleY(1) }
}
/* Opacity only: moving text inside a scaled canvas lands on fractional device
   pixels and shimmers. A dip reads as a refresh either way. */
@keyframes hiw4-rise {
  0%, 60% { opacity: 1 }
  72% { opacity: 0.35 }
  100% { opacity: 1 }
}
/* The scale property, not transform: radix carries the bar's value in an inline
   transform, and scale composes with it instead of replacing it. */
@keyframes hiw4-fill {
  0%, 52% { scale: 1 1 }
  64% { scale: 0.1 1 }
  100% { scale: 1 1 }
}
@keyframes hiw4-blink {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.4 }
}
@keyframes hiw4-draw {
  0%, 50% { stroke-dashoffset: 0 }
  62% { stroke-dashoffset: 1200 }
  100% { stroke-dashoffset: 0 }
}
/* Activating a tab mounts its panel fresh, so this replays on every switch,
   which is what gives the self-advancing bar something to land on. */
@keyframes hiw4-enter {
  from { opacity: 0; transform: translateY(8px) }
  to { opacity: 1; transform: translateY(0) }
}
/* No scale: it would resample every glyph on the way in. The lift keeps its own
   layer, so the text is rasterised once and carried by the compositor. */
.hiw4-enter {
  animation: hiw4-enter 0.45s cubic-bezier(0.22, 1, 0.36, 1) var(--hiw4-delay, 0s) both;
  will-change: opacity, transform;
}
.hiw4-grow,
.hiw4-rise,
.hiw4-draw,
.hiw4-track [data-slot="progress-indicator"] {
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-iteration-count: infinite;
  animation-fill-mode: both;
  animation-delay: var(--hiw4-delay, 0s);
}
.hiw4-grow { animation-name: hiw4-grow; animation-duration: 11.3s; }
/* Promoted for the whole cycle: a text node off opacity 1 swaps antialiasing
   mode, which reads as the glyphs changing weight. */
.hiw4-rise {
  animation-name: hiw4-rise;
  animation-duration: 13.7s;
  will-change: opacity;
}
.hiw4-draw { animation-name: hiw4-draw; animation-duration: 16.3s; }
.hiw4-track [data-slot="progress-indicator"] {
  transform-origin: left center;
  animation-name: hiw4-fill;
  animation-duration: 10.1s;
}
.hiw4-blink {
  animation: hiw4-blink 3.7s ease-in-out var(--hiw4-delay, 0s) infinite;
  will-change: opacity;
}
@media (prefers-reduced-motion: reduce) {
  .hiw4-grow,
  .hiw4-rise,
  .hiw4-draw,
  .hiw4-blink,
  .hiw4-enter,
  .hiw4-track [data-slot="progress-indicator"] {
    animation: none;
  }
}
`;

/** Fills the frame body and clips like a real canvas. The motion sheet is mounted
    by the showcase: a panel is rebuilt per step, and re-inserting it costs a recalc. */
function Workspace({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      /* `clip` for the same reason as the frame: the views run taller than the
         canvas on purpose, and a scrollable box here would let focus drag them. */
      className="relative flex h-full min-h-0 flex-col gap-4 overflow-clip p-4 text-neutral-900 dark:text-neutral-50"
    >
      {children}
    </div>
  );
}

/** Every view is titled by the step it answers, never by its own subject. */
export interface WorkspaceProps {
  caption: string;
  title: string;
}

/** Stagger step for a panel's cards settling in, in seconds. */
const ENTER_STEP = 0.06;

/** Per-card entrance delay, capped so a long grid does not trail. */
function enterDelay(index: number) {
  return {
    "--hiw4-delay": `${Math.min(index, 8) * ENTER_STEP}s`,
  } as React.CSSProperties;
}

function SectionHeader({
  title,
  caption,
  action,
}: {
  title: string;
  caption: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-base leading-none tracking-tight">
          {title}
        </span>
        <span className="text-neutral-500 text-sm dark:text-neutral-400">
          {caption}
        </span>
      </div>
      {action}
    </div>
  );
}

// #region Overview
function LegendItem({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-neutral-500 text-sm dark:text-neutral-400">
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", className)}
      />
      {label}
    </span>
  );
}

function DemandStat({
  label,
  value,
  dotClassName,
  valueClassName,
}: {
  label: string;
  value: string;
  dotClassName: string;
  valueClassName?: string;
}) {
  return (
    <Badge
      className="h-auto! gap-2 border-neutral-200 bg-neutral-50 px-2.5 py-1.5 dark:border-neutral-800 dark:bg-neutral-800/50"
      radius="full"
      size="xl"
      variant="outline"
    >
      <span
        aria-hidden="true"
        className={cn("size-2.5 shrink-0 rounded-full", dotClassName)}
      />
      <span className="text-neutral-500 text-sm dark:text-neutral-400">
        {label}
      </span>
      <span
        className={cn(
          "ms-2 font-semibold text-sm tabular-nums",
          valueClassName
        )}
      >
        {value}
      </span>
    </Badge>
  );
}

// Bars are laid out in the flow; only the target line is SVG, with
// `non-scaling-stroke` so the stretch to panel width never thickens it.
function InstallsChart() {
  const step = 300 / (INSTALL_DAYS.length - 1);
  const line = INSTALL_DAYS.map(
    (day, index) =>
      `${index === 0 ? "M" : "L"}${(index * step).toFixed(2)} ${(
        100 - (day.target / INSTALL_PEAK) * 100
      ).toFixed(2)}`
  ).join(" ");

  return (
    <div className="relative min-h-0 flex-1">
      {/* One dashed rule at the peak, which is what the bars are measured to. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 border-neutral-200 border-t border-dashed dark:border-neutral-700"
      />

      <div className="flex h-full items-end gap-1.5">
        {INSTALL_DAYS.map((day, index) => (
          <div
            className="hiw4-grow flex h-full min-w-0 flex-1 origin-bottom flex-col justify-end"
            key={day.id}
            style={
              { "--hiw4-delay": `${-index * 0.16}s` } as React.CSSProperties
            }
          >
            <span
              aria-hidden="true"
              className={cn("w-full rounded-t-full", HATCH)}
              style={{ height: `${(day.mcp / INSTALL_PEAK) * 100}%` }}
            />
            <span
              aria-hidden="true"
              className="w-full bg-teal-400"
              style={{ height: `${(day.cli / INSTALL_PEAK) * 100}%` }}
            />
          </div>
        ))}
      </div>

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full"
        preserveAspectRatio="none"
        viewBox="0 0 300 100"
      >
        <path
          className="hiw4-draw stroke-rose-500"
          d={line}
          fill="none"
          strokeDasharray={1200}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

export function OverviewWorkspace({ title, caption }: WorkspaceProps) {
  return (
    <Workspace>
      <SectionHeader caption={caption} title={title} />
      {/* KPI strip. Five tiles across, 132 units tall in the export. */}
      <div className="grid h-[132px] shrink-0 grid-cols-5 gap-3">
        {KPIS.map((kpi, index) => (
          <Card
            className={cn(PANEL, "ring-1 [--card-spacing:--spacing(3.5)]")}
            key={kpi.id}
            size="sm"
            style={
              { "--hiw4-delay": `${-index * 1.7}s` } as React.CSSProperties
            }
          >
            <CardContent className="flex h-full flex-col justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <IconTile
                  className={kpi.tileClassName}
                  size="sm"
                  variant="soft"
                >
                  {kpi.icon}
                </IconTile>
                <span className="truncate font-semibold text-base">
                  {kpi.label}
                </span>
              </div>

              <div className="flex items-end justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="hiw4-rise truncate font-semibold text-3xl tabular-nums leading-none tracking-tight">
                    {kpi.value}
                  </span>
                  <span className="truncate text-neutral-500 text-sm dark:text-neutral-400">
                    {kpi.caption}
                  </span>
                </div>
                <Badge
                  className={cn(
                    "shrink-0 gap-1 font-medium text-xs",
                    kpi.deltaClassName
                  )}
                  radius="full"
                  variant="outline"
                >
                  {kpi.rising ? (
                    <TrendingUp aria-hidden="true" />
                  ) : (
                    <TrendingDown aria-hidden="true" />
                  )}
                  {kpi.delta}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trending blocks against recent activity, split roughly 3:2. */}
      <div className="flex h-[450px] shrink-0 gap-4">
        <Card
          className={cn(
            PANEL,
            "min-h-0 flex-[1.55] ring-1 [--card-spacing:--spacing(4)]"
          )}
          size="sm"
        >
          <CardHeader>
            <CardTitle className="text-base leading-none">
              Trending Blocks
            </CardTitle>
            <CardDescription className="text-neutral-500 text-sm dark:text-neutral-400">
              Most installed this week
            </CardDescription>
            <CardAction>
              <Badge
                className="border-violet-200 bg-violet-50 font-medium text-violet-700 text-xs dark:border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-300"
                radius="full"
                variant="outline"
              >
                {TRENDING_BLOCKS.length} blocks
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800">
            <div className="grid shrink-0 grid-cols-[1.7fr_2fr_0.6fr_0.8fr_0.9fr] items-center gap-3 border-neutral-200 border-b px-3 py-2 font-medium text-sm dark:border-neutral-800">
              <span>Block</span>
              <span>Installs</span>
              <span>Version</span>
              <span>Uses</span>
              <span>Status</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {TRENDING_BLOCKS.map((block, index) => {
                const status = BLOCK_STATUS[block.status];

                return (
                  <div
                    className="grid flex-1 grid-cols-[1.7fr_2fr_0.6fr_0.8fr_0.9fr] items-center gap-3 border-neutral-100 border-b px-3 last:border-b-0 dark:border-neutral-800/70"
                    key={block.id}
                    style={
                      {
                        "--hiw4-delay": `${-index * 0.9}s`,
                      } as React.CSSProperties
                    }
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <IconTile
                        className={cn("shrink-0", block.accent)}
                        size="sm"
                        variant="soft"
                      >
                        {block.icon}
                      </IconTile>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-sm">
                          {block.name}
                        </span>
                        <span className="truncate text-neutral-500 text-sm dark:text-neutral-400">
                          {block.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-sm tabular-nums">
                          {block.installs}
                        </span>
                        <span className="truncate text-neutral-500 text-sm dark:text-neutral-400">
                          {block.note}
                        </span>
                      </div>
                      <Progress
                        aria-label={`${block.name} popularity`}
                        /* Track styling twice over: base nests a progress-track
                           inside the root, radix makes the root the track. */
                        className={cn(
                          "hiw4-track h-1.5 w-full gap-0 bg-neutral-200 dark:bg-neutral-800",
                          "[&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-neutral-200 dark:[&_[data-slot=progress-track]]:bg-neutral-800",
                          status.indicatorClassName
                        )}
                        value={block.popularity}
                      />
                    </div>

                    <span className="text-sm tabular-nums">
                      {block.version}
                    </span>
                    <span className="text-sm tabular-nums">{block.uses}</span>
                    <span>
                      <Badge
                        className={cn(
                          "font-medium text-xs",
                          status.badgeClassName
                        )}
                        radius="full"
                        variant="outline"
                      >
                        {status.label}
                      </Badge>
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            PANEL,
            "min-h-0 flex-1 ring-1 [--card-spacing:--spacing(4)]"
          )}
          size="sm"
        >
          <CardHeader>
            <CardTitle className="text-base leading-none">
              Recent Activity
            </CardTitle>
            <CardDescription className="text-neutral-500 text-sm dark:text-neutral-400">
              Latest in the registry
            </CardDescription>
            <CardAction>
              <MoreHorizontalIcon
                aria-hidden="true"
                className="size-4 text-neutral-400 dark:text-neutral-500"
              />
            </CardAction>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800">
            {RECENT_ACTIVITY.map((item) => (
              <div
                className="flex min-w-0 flex-1 items-center gap-2.5 border-neutral-100 border-b px-3 last:border-b-0 dark:border-neutral-800/70"
                key={item.id}
              >
                <IconTile
                  className={cn(
                    "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50",
                    item.tileClassName,
                    item.live ? "hiw4-blink" : null
                  )}
                  variant="outline"
                >
                  {item.icon}
                </IconTile>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-sm">
                    {item.title}
                  </span>
                  <span className="truncate text-neutral-500 text-sm dark:text-neutral-400">
                    {item.meta}
                  </span>
                </div>
                <Badge
                  className="shrink-0 border-neutral-200 bg-white font-medium text-neutral-700 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  radius="full"
                  variant="outline"
                >
                  {item.action}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Installs chart, cropped by the frame partway down its plot. */}
      <Card
        className={cn(
          PANEL,
          "min-h-0 flex-1 ring-1 [--card-spacing:--spacing(4)]"
        )}
        size="sm"
      >
        <CardHeader>
          <CardTitle className="text-base leading-none">Installs</CardTitle>
          <CardDescription className="text-neutral-500 text-sm dark:text-neutral-400">
            CLI and MCP installs over time
          </CardDescription>
          <CardAction className="flex items-center gap-2">
            <DemandStat
              dotClassName="bg-teal-400"
              label="Installs"
              value={group(INSTALL_TOTAL)}
            />
            <DemandStat
              dotClassName="bg-rose-500"
              label="Target"
              value={group(TARGET_TOTAL)}
            />
            <DemandStat
              dotClassName="bg-emerald-400"
              label="Gap"
              value={`+${group(INSTALL_GAP)}`}
              valueClassName="text-emerald-600 dark:text-emerald-400"
            />
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-4">
              <LegendItem className="bg-teal-400" label="CLI" />
              <LegendItem className={HATCH} label="MCP" />
              <LegendItem className="bg-rose-500" label="Target" />
            </div>
            <Badge
              className="border-violet-200 bg-violet-50 font-medium text-violet-700 text-xs dark:border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-300"
              radius="full"
              variant="outline"
            >
              21 day view
            </Badge>
          </div>

          <InstallsChart />

          <div className="flex shrink-0 items-center justify-between text-neutral-400 text-xs dark:text-neutral-500">
            {INSTALL_TICKS.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </Workspace>
  );
}
// #endregion

// #region Feature tabs
function FeatureBadge({ label }: { label: string }) {
  return (
    <Badge
      className="h-7 border-neutral-200 bg-white px-2.5 font-medium text-neutral-600 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
      radius="full"
      variant="outline"
    >
      {label}
    </Badge>
  );
}

export function ComponentsWorkspace({ title, caption }: WorkspaceProps) {
  return (
    <Workspace>
      <SectionHeader
        action={<FeatureBadge label={`${COMPONENT_TOTAL} components`} />}
        caption={caption}
        title={title}
      />
      <div className="grid shrink-0 auto-rows-[11.5rem] grid-cols-3 gap-3.5">
        {COMPONENT_GROUPS.map((group, index) => (
          <Card
            className={cn(
              PANEL,
              "hiw4-enter ring-1 [--card-spacing:--spacing(4)]"
            )}
            key={group.id}
            size="sm"
            style={enterDelay(index)}
          >
            <CardContent className="flex h-full flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-2">
                <IconTile
                  className={group.accent}
                  size="default"
                  variant="soft"
                >
                  {group.icon}
                </IconTile>
                {group.tag ? (
                  <Badge
                    className="hiw4-blink border-neutral-200 bg-white font-medium text-neutral-600 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    radius="full"
                    style={
                      {
                        "--hiw4-delay": `${-index * 0.5}s`,
                      } as React.CSSProperties
                    }
                    variant="outline"
                  >
                    {group.tag}
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-base">{group.name}</span>
                <span className="text-neutral-500 text-sm dark:text-neutral-400">
                  {group.blurb}
                </span>
              </div>
              {/* The tally is the live figure on this view, so it carries the
                  same ambient rise the Overview counters do. */}
              <div
                className="hiw4-rise flex items-center gap-1.5 text-neutral-400 text-sm dark:text-neutral-500"
                style={
                  { "--hiw4-delay": `${-index * 1.3}s` } as React.CSSProperties
                }
              >
                <span>{group.count} components</span>
                <span
                  aria-hidden="true"
                  className="size-1 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600"
                />
                <span>{group.installs} installs</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Workspace>
  );
}

export function InstallWorkspace({ title, caption }: WorkspaceProps) {
  return (
    <Workspace>
      <SectionHeader caption={caption} title={title} />
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {CLI_ITEMS.map((item, index) => (
          <Item
            className={cn(
              PANEL,
              "hiw4-enter gap-3 border border-neutral-200 px-4 py-3 ring-0 dark:border-neutral-800"
            )}
            key={item.id}
            size="sm"
            style={enterDelay(index)}
          >
            <IconTile
              className="text-neutral-500 dark:text-neutral-400"
              size="sm"
              variant="soft"
            >
              {item.icon}
            </IconTile>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{item.name}</span>
                <Badge
                  className="border-neutral-200 bg-neutral-100 px-1.5 font-medium font-mono text-neutral-500 text-xs dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                  variant="outline"
                >
                  {item.command}
                </Badge>
              </div>
              <span className="text-neutral-500 text-sm dark:text-neutral-400">
                {item.summary}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge
                className={cn(
                  "hiw4-blink font-medium text-xs",
                  item.statusClassName
                )}
                radius="full"
                style={
                  { "--hiw4-delay": `${-index * 0.7}s` } as React.CSSProperties
                }
                variant="outline"
              >
                {item.status}
              </Badge>
              <span
                className="hiw4-rise text-neutral-400 text-sm tabular-nums dark:text-neutral-500"
                style={
                  { "--hiw4-delay": `${-index * 1.1}s` } as React.CSSProperties
                }
              >
                {item.installs}
              </span>
            </div>
          </Item>
        ))}
      </div>
    </Workspace>
  );
}

export function IntegrationsWorkspace({ title, caption }: WorkspaceProps) {
  return (
    <Workspace>
      <SectionHeader caption={caption} title={title} />
      {/* Four rows sized to fill the frame; the last row bleeds off the bottom
          like a scrolled settings page. */}
      <div className="grid shrink-0 auto-rows-[12rem] grid-cols-3 gap-3.5">
        {INTEGRATIONS.map((integration, index) => (
          <Card
            className={cn(
              PANEL,
              "hiw4-enter gap-0 overflow-hidden ring-1 [--card-spacing:0px]"
            )}
            key={integration.id}
            size="sm"
            style={enterDelay(index)}
          >
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <IconTile
                  className="border-white bg-neutral-100 dark:border-neutral-900 dark:bg-neutral-800"
                  variant="elevated"
                >
                  {integration.logo}
                </IconTile>
                <ExternalLinkIcon
                  aria-hidden="true"
                  className="size-4 text-neutral-400 dark:text-neutral-500"
                />
              </div>
              <p className="text-neutral-500 text-sm dark:text-neutral-400">
                {integration.description}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 border-neutral-100 border-t px-3 py-2.5 dark:border-neutral-800">
              {integration.connected ? (
                <span className="font-medium text-neutral-600 text-sm dark:text-neutral-300">
                  Disconnect
                </span>
              ) : (
                <Badge className="gap-1.5 border-transparent bg-neutral-900 px-2 py-1 font-medium text-white text-xs dark:bg-white dark:text-neutral-900">
                  <PlugZapIcon aria-hidden="true" />
                  Connect
                </Badge>
              )}
              {/* Only a connected switch pulses; an unconnected one has no link
                  to report on. */}
              <span
                aria-hidden="true"
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full",
                  integration.connected
                    ? "hiw4-blink bg-neutral-900 dark:bg-white"
                    : "bg-neutral-200 dark:bg-neutral-700"
                )}
                style={
                  { "--hiw4-delay": `${-index * 0.6}s` } as React.CSSProperties
                }
              >
                <span
                  className={cn(
                    "absolute size-4 rounded-full bg-white shadow-sm dark:bg-neutral-900",
                    integration.connected
                      ? "translate-x-[18px]"
                      : "translate-x-0.5"
                  )}
                />
              </span>
            </div>
          </Card>
        ))}
      </div>
    </Workspace>
  );
}
// #endregion
