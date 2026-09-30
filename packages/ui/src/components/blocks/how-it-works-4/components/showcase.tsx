import { IconTile } from "@personal-os/ui/components/reui/icon-tile";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@personal-os/ui/components/tabs";
import { cn } from "cn";
import { useEffect, useState } from "react";

import { AppShell } from "./app-shell";
import { STEPS } from "./data";
import { FrameBackdrop } from "./frame-backdrop";
import {
  ComponentsWorkspace,
  FRAME_MOTION,
  InstallWorkspace,
  OverviewWorkspace,
  type WorkspaceProps,
} from "./workspaces";

/** Keyed by step value, so the strip and the console can never drift apart. */
const WORKSPACES: Record<string, (props: WorkspaceProps) => React.ReactNode> = {
  add: InstallWorkspace,
  pick: ComponentsWorkspace,
  "set-up": OverviewWorkspace,
};

/**
 * How long a step holds before the strip moves on; three steps ≈ 18s.
 * customize: raise it for denser views, or set it to 0 to stop the walk.
 */
const STEP_DWELL_MS = 6000;

const DEFAULT_STEP = STEPS[0]!;

export function Showcase({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState(DEFAULT_STEP.value);

  /* Held while a reader is on the strip, so the step never moves out from under
     someone mid-sentence. Focus counts too, the keyboard equivalent. */
  const [held, setHeld] = useState(false);

  useEffect(() => {
    // Frozen demo: the walk is what makes two captures differ.
    if (document.documentElement.dataset.demo === "frozen") {
      return;
    }
    if (held || STEP_DWELL_MS <= 0) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Keyed on `value`: a click restarts the dwell, and the cleanup leaves at
    // most one timer pending, so a step is never advanced twice.
    const timer = setTimeout(() => {
      setValue((current) => {
        const index = STEPS.findIndex((item) => item.value === current);
        const next = STEPS[(index + 1) % STEPS.length];
        return next?.value ?? DEFAULT_STEP.value;
      });
    }, STEP_DWELL_MS);

    return () => clearTimeout(timer);
  }, [value, held]);

  const active = STEPS.find((item) => item.value === value) ?? DEFAULT_STEP;

  return (
    <>
      {/* Mounted once: a panel is rebuilt per step, and carrying the sheet with
          it would re-run the cascade on every switch. */}
      <style>{FRAME_MOTION}</style>

      {/* The hold handlers sit here, on a real box: a `display: contents`
          wrapper has no layout box and so receives no pointer events. */}
      <Tabs
        className="w-full gap-0"
        onBlurCapture={() => setHeld(false)}
        onFocusCapture={() => setHeld(true)}
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onValueChange={setValue}
        value={value}
      >
        <TabsList
          className={cn(
            "grid! items-stretch! h-auto! w-full gap-0 rounded-none border-b bg-transparent p-0!",
            compact ? "grid-cols-3" : "@2xl:grid-cols-3 grid-cols-1"
          )}
          variant="line"
        >
          {STEPS.map((item) => (
            <TabsTrigger
              className={cn(
                "h-auto! w-full flex-none cursor-pointer items-center justify-start rounded-none border-border! border-r-0 border-b-0 border-l-0 text-start transition-colors after:hidden hover:bg-muted/50 data-active:bg-muted!",
                compact
                  ? "border-t-0 p-2.5 [&:not(:last-child)]:border-r!"
                  : "border-t @2xl:border-t-0! p-3 first:border-t-0 @2xl:[&:not(:last-child)]:border-r!"
              )}
              key={item.value}
              value={item.value}
            >
              <span
                className={cn(
                  "flex w-full items-start",
                  compact ? "gap-2 px-1.5 py-1.5" : "gap-2.5 px-3 py-2.5"
                )}
              >
                <IconTile
                  className="self-start border-0 bg-primary/5 [--icon-tile-inset:--spacing(1)]"
                  variant="frame"
                >
                  <span className="font-medium text-base text-foreground tabular-nums">
                    {item.number}
                  </span>
                </IconTile>
                <span className="flex min-w-0 flex-1 flex-col gap-px text-sm">
                  <span className="font-medium text-foreground">
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      "text-wrap font-normal text-muted-foreground",
                      compact && "line-clamp-2 text-xs leading-4"
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/*
          Compact: size container so AppShell can scale against both cqw and
          cqh. Fixed height + w-full avoids aspect-ratio/max-height shrinking
          the used width while cqw still tracked the wider parent (right clip).
        */}
        <div className={cn("w-full", !compact && "@container")}>
          <div
            className={cn(
              "relative w-full overflow-clip",
              compact ? "@container-size h-64 sm:h-72 lg:h-80" : "aspect-[20/9]"
            )}
          >
            <div
              className={cn(
                "absolute inset-x-0 top-0",
                compact ? "inset-y-0" : "aspect-[16/10]"
              )}
            >
              <FrameBackdrop />
              <div
                aria-hidden="true"
                className="absolute inset-x-[5cqw] top-[5cqw] -bottom-[4cqw] rounded-[calc(var(--radius)*1.5)] bg-white/10 ring-1 ring-white/25 ring-inset"
              />
              <div className="absolute inset-0">
                <AppShell activeNavId={active.navId} compact={compact}>
                  {STEPS.filter((item) => item.value === value).map((item) => {
                    const View = WORKSPACES[item.value];
                    if (!View) {
                      return null;
                    }
                    const Panel = View;
                    return (
                      <TabsContent
                        aria-label={`${item.title} preview`}
                        className="m-0 min-h-0 flex-1"
                        key={item.value}
                        onMouseDown={(event) => event.preventDefault()}
                        tabIndex={-1}
                        value={item.value}
                      >
                        <Panel
                          caption={item.panelCaption}
                          title={item.panelTitle}
                        />
                      </TabsContent>
                    );
                  })}
                </AppShell>
              </div>
            </div>
          </div>
        </div>
      </Tabs>
    </>
  );
}
