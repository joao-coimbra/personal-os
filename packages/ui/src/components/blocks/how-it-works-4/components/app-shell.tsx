import { Card, CardContent } from "@personal-os/ui/components/card";
import { Item } from "@personal-os/ui/components/item";
import { Kbd } from "@personal-os/ui/components/kbd";
import { Badge } from "@personal-os/ui/components/reui/badge";
import { IconTile } from "@personal-os/ui/components/reui/icon-tile";
import { cn } from "cn";
import {
  ActivityIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  SearchIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { BLOCK_SUB_ITEMS, BREADCRUMB, NAV_ITEMS } from "./data";
import { ReuiMark } from "./reui-mark";

/** Shared panel surface: the console stands on a photo, not on the page tokens. */
export const PANEL =
  "border-0 bg-white text-neutral-900 ring-neutral-900/8 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-white/10";

function TopBar() {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-neutral-200 border-b px-2.5 dark:border-neutral-800">
      <IconTile
        className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
        size="xs"
        variant="solid"
      >
        <ReuiMark />
      </IconTile>

      {BREADCRUMB.map((crumb, index) => (
        <div className="contents" key={crumb.id}>
          {index > 0 ? (
            <span
              aria-hidden="true"
              className="text-neutral-300 dark:text-neutral-600"
            >
              /
            </span>
          ) : null}
          <span className="flex items-center gap-1.5 font-medium text-sm">
            {crumb.dotClassName ? (
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  crumb.dotClassName
                )}
              />
            ) : null}
            {crumb.label}
            <ChevronsUpDownIcon
              aria-hidden="true"
              className="text-neutral-400 dark:text-neutral-500"
            />
          </span>
        </div>
      ))}

      <Badge
        className="ms-auto h-6 gap-1.5 border-neutral-200 bg-white px-2 font-medium text-neutral-600 text-xs dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
        radius="full"
        variant="outline"
      >
        <ActivityIcon aria-hidden="true" />
        Sistema
        <span className="text-emerald-600 dark:text-emerald-400">Ok</span>
      </Badge>
    </div>
  );
}

function Sidebar({ activeNavId }: { activeNavId: string }) {
  return (
    <div className="flex w-56 shrink-0 flex-col gap-1.5 border-neutral-200 border-r bg-neutral-50 p-2 pb-[168px] dark:border-neutral-800 dark:bg-neutral-950">
      <Item
        className="gap-2 border-neutral-200 bg-white px-2 py-1.5 text-neutral-400 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500"
        size="xs"
        variant="outline"
      >
        <SearchIcon aria-hidden="true" className="size-4" />
        Search...
        <Kbd className="ms-auto h-5 min-w-5 bg-neutral-100 px-1.5 text-neutral-400 text-xs dark:bg-neutral-800 dark:text-neutral-500">
          ⌘K
        </Kbd>
      </Item>

      <div className="px-2 pt-1.5 font-medium text-neutral-400 text-xs dark:text-neutral-500">
        Platform
      </div>

      <div className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <div className="contents" key={item.id}>
            <Item
              className={cn(
                "gap-2 border-transparent px-2 py-1.5 text-sm",
                item.id === activeNavId
                  ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                  : "text-neutral-600 dark:text-neutral-400"
              )}
              size="xs"
            >
              {item.icon}
              {item.label}
              {item.expandable ? (
                item.expanded ? (
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="ms-auto text-neutral-400 dark:text-neutral-500"
                  />
                ) : (
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="ms-auto text-neutral-400 dark:text-neutral-500"
                  />
                )
              ) : null}
            </Item>

            {item.expanded ? (
              <div className="ms-4 flex flex-col gap-0.5 border-neutral-200 border-l ps-1 dark:border-neutral-800">
                {BLOCK_SUB_ITEMS.map((sub) => (
                  <Item
                    className={cn(
                      "border-transparent px-2 py-1.5 text-sm",
                      sub.id === activeNavId
                        ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                        : "text-neutral-500 dark:text-neutral-400"
                    )}
                    key={sub.id}
                    size="xs"
                  >
                    {sub.label}
                  </Item>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <Card
        className={cn(
          PANEL,
          "mt-auto gap-2 border border-neutral-200 shadow-sm ring-0 [--card-spacing:--spacing(2.5)] dark:border-neutral-800"
        )}
        size="sm"
      >
        <CardContent className="flex flex-col gap-2">
          <span className="font-semibold text-sm">
            Multi-theme support is here
          </span>
          <span className="text-neutral-500 text-sm leading-5 dark:text-neutral-400">
            Switch between Vega, Nova, Maia, Lyra, and Mira themes.
          </span>
          <span
            aria-hidden="true"
            className="relative block h-20 w-full overflow-hidden bg-[radial-gradient(120%_90%_at_12%_18%,var(--color-orange-400)_0%,transparent_46%),radial-gradient(120%_120%_at_88%_8%,var(--color-fuchsia-500)_0%,transparent_55%),linear-gradient(160deg,var(--color-violet-600)_0%,var(--color-sky-400)_58%,var(--color-cyan-400)_100%)]"
          >
            {/* Wave over the gradient, matching the hero chip. */}
            <svg
              aria-hidden="true"
              className="absolute inset-0 size-full"
              preserveAspectRatio="none"
              viewBox="0 0 96 34"
            >
              <defs>
                <linearGradient id="hiw4-wave" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="white" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="white" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <path
                d="M0 26 C 18 26 26 12 48 12 C 70 12 78 22 96 22 L96 34 L0 34 Z"
                fill="url(#hiw4-wave)"
              />
            </svg>
          </span>
          <div className="flex items-center justify-between text-neutral-500 text-xs dark:text-neutral-400">
            <span>Read more</span>
            <span>Dismiss</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AppShell({
  activeNavId,
  children,
}: {
  activeNavId: string;
  children: ReactNode;
}) {
  return (
    <div
      // Taller than the visible frame on purpose: it crops the console at the
      // bottom. Keep the transform; `zoom` is not portable enough to swap in.
      className="absolute top-[6.25cqw] left-[6.25cqw] h-[1060px] w-[1400px] origin-top-left"
      style={{ transform: "scale(calc(100cqw / 1600px))" }}
    >
      <Card
        className={cn(
          PANEL,
          "size-full gap-0 overflow-hidden px-1.5 shadow-2xl ring-1 ring-neutral-900/10 [--card-spacing:--spacing(1.5)] dark:ring-white/10"
        )}
      >
        <Card className="relative min-h-0 flex-1 flex-col gap-0 overflow-hidden border border-neutral-200 bg-white text-neutral-900 shadow-none ring-0 [--card-spacing:0px] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50">
          <div aria-hidden="true" className="contents">
            <TopBar />
          </div>

          <div className="flex min-h-0 flex-1">
            <div aria-hidden="true" className="contents">
              <Sidebar activeNavId={activeNavId} />
            </div>

            {/* Workspace: the one region that swaps per step. */}
            <div className="flex min-w-0 flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
              {children}
            </div>
          </div>
        </Card>
      </Card>
    </div>
  );
}
