import { Progress } from "@personal-os/ui/components/progress";
import { SidebarGroup } from "@personal-os/ui/components/sidebar";

import { FOCUS } from "./data";

// A single in-progress milestone with a completion bar - the sidebar-footer
// stat card (SpendingLimit pattern from app-shell-15, restated on theme tokens).
export function FocusCard() {
  const pct = Math.round((FOCUS.completed / FOCUS.total) * 100);

  return (
    <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
      <div className="space-y-2.5 rounded-xl border border-dashed bg-muted/40 p-3">
        <div className="flex items-center justify-between font-medium text-muted-foreground text-xs">
          <span className="whitespace-nowrap">Focus Progress</span>
          <span className="whitespace-nowrap text-foreground tabular-nums">
            {FOCUS.completed} / {FOCUS.total}
          </span>
        </div>
        <Progress aria-label="Focus progress" className="h-1.5" value={pct} />
        <div className="space-y-0.5">
          <p className="whitespace-nowrap font-semibold text-foreground text-sm">
            {FOCUS.title}
          </p>
          <p className="text-muted-foreground text-xs">{FOCUS.caption}</p>
        </div>
      </div>
    </SidebarGroup>
  );
}
