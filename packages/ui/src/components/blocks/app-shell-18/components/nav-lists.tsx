import { Badge } from "@personal-os/ui/components/reui/badge";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@personal-os/ui/components/sidebar";
import { cn } from "@personal-os/ui/lib/utils";
import { useState } from "react";

import { TASK_LISTS } from "./data";

// Active row gets a clear primary wash + colored icon so it reads instantly
// against the white sidebar; hover stays a neutral accent. The "!" wins over
// the primitive's default accent state (which matches the backdrop here).
const ACTIVE_CLASS =
  "bg-primary/10! text-primary hover:bg-primary/15! font-medium [&_svg]:text-primary!";

export function NavLists() {
  const [active, setActive] = useState(
    () =>
      TASK_LISTS.find((list) => list.isActive)?.id ?? TASK_LISTS[0]?.id ?? "all"
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="whitespace-nowrap group-data-[collapsible=icon]:hidden">
        My Lists
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.25">
          {TASK_LISTS.map((list) => (
            <SidebarMenuItem key={list.id}>
              <SidebarMenuButton
                className={cn(
                  "hover:bg-primary/5!",
                  active === list.id && ACTIVE_CLASS
                )}
                isActive={active === list.id}
                onClick={() => setActive(list.id)}
                tooltip={{
                  children: (
                    <span className="flex items-center gap-2">
                      {list.label}
                      <span className="tabular-nums opacity-60">
                        {list.count}
                      </span>
                    </span>
                  ),
                }}
              >
                {list.icon}
                <span className="truncate">{list.label}</span>
                <Badge
                  className="ml-auto tabular-nums group-data-[collapsible=icon]:hidden"
                  size="sm"
                  variant="secondary"
                >
                  {list.count}
                </Badge>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
