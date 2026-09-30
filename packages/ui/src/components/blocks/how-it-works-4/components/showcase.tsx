import { IconTile } from "@personal-os/ui/components/reui/icon-tile";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@personal-os/ui/components/tabs";
import { useEffect, useState } from "react";

import { AppShell } from "./app-shell";
import { STEPS } from "./data";
import { FrameBackdrop } from "./frame-backdrop";
import {
  ComponentsWorkspace,
  FRAME_MOTION,
  InstallWorkspace,
  IntegrationsWorkspace,
  OverviewWorkspace,
  type WorkspaceProps,
} from "./workspaces";

/** Keyed by step value, so the strip and the console can never drift apart. */
const WORKSPACES: Record<string, (props: WorkspaceProps) => React.ReactNode> = {
  add: InstallWorkspace,
  pick: ComponentsWorkspace,
  "set-up": OverviewWorkspace,
  ship: IntegrationsWorkspace,
};

/**
 * How long a step holds before the strip moves on; the circuit runs ~24s.
 * customize: raise it for denser views, or set it to 0 to stop the walk.
 */
const STEP_DWELL_MS = 6000;

const DEFAULT_STEP = STEPS[0]!;

export function Showcase() {
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
        {/* The design draws the four steps as one row, so the row holds from a
            tablet up; only a phone stacks them. */}
        <TabsList
          className="grid! items-stretch! h-auto! w-full @2xl:grid-cols-2 @3xl:grid-cols-4 grid-cols-1 gap-0 rounded-none border-b bg-transparent p-0!"
          variant="line"
        >
          {STEPS.map((item) => (
            <TabsTrigger
              /* A cell rules off its right neighbour only; the row ends and the
                 last row stay bare, so the card's own edge is a single hairline. */
              className="h-auto! w-full flex-none cursor-pointer items-center justify-start rounded-none border-border! border-t @3xl:border-t-0! border-r-0 border-b-0 border-l-0 p-3 text-start transition-colors after:hidden first:border-t-0 hover:bg-muted/50 data-active:bg-muted! @2xl:[&:nth-child(-n+2)]:border-t-0 @3xl:[&:nth-child(2)]:border-r! @2xl:[&:nth-child(odd)]:border-r!"
              key={item.value}
              value={item.value}
            >
              {/* Spans, not the Item slots: ItemContent and ItemTitle are divs and
                  ItemDescription a <p>, none legal inside the trigger's button. */}
              <span className="flex w-full items-start gap-2.5 px-3 py-2.5">
                {/* Borderless 5% tint around a shadowed plate, the step chip.
                    The radius is left to the tile: lyra and sera square it there. */}
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
                  {/* Unclamped: a step loses its meaning the moment it is cut. */}
                  <span className="text-wrap font-normal text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Console on the sky field: a 16:10 frame cropped to the design's 576
            of 800, so the shell runs off the bottom edge rather than stopping. */}
        <div className="@container w-full">
          {/* Full bleed to the strip's own edges, so no radius is needed. Clip,
              not hidden: a scroll port here lets focus slide the console away. */}
          <div className="relative aspect-[20/9] overflow-clip">
            <div className="absolute inset-x-0 top-0 aspect-[16/10]">
              <FrameBackdrop />
              {/* The glass plate sits outside the console, so it rounds wider than
                  it does; derived from --radius, so a square style stays square. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-[5cqw] top-[5cqw] -bottom-[4cqw] rounded-[calc(var(--radius)*1.5)] bg-white/10 ring-1 ring-white/25 ring-inset"
              />
              <div className="absolute inset-0">
                <AppShell activeNavId={active.navId}>
                  {/* Only the live panel is rendered: the primitive waits out a
                      leaving panel's animations, and these loops never end. */}
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
                        /* Focus landing in the art has the browser scroll it into
                           view, which drags the page to it. */
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
