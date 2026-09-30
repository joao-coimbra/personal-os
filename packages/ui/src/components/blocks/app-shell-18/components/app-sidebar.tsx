import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@personal-os/ui/components/sidebar";

import { ORG } from "./data";
import { FocusCard } from "./focus-card";
import { Logo } from "./logo";
import { NavLists } from "./nav-lists";
import { NavUser } from "./nav-user";
import { NewTask } from "./new-task";
import { SidebarTags } from "./sidebar-tags";

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="floating">
      {/* Brand - full wordmark expanded, mini mark when collapsed.
          Logo stays left-anchored (px-2.5) in both states so it does NOT
          re-center against the animating rail width on collapse (no jump);
          px-2.5 lands the logo on the nav-icon spine in both states. */}
      <SidebarHeader className="h-(--header-height) flex-row items-center px-2.5">
        <a
          aria-label={ORG.name}
          className="flex items-center gap-2 overflow-hidden"
          href="#"
        >
          <Logo />
          <span className="truncate font-medium text-sm group-data-[collapsible=icon]:hidden">
            {ORG.name}
          </span>
        </a>
      </SidebarHeader>

      <SidebarContent>
        {/* Primary action */}
        <SidebarGroup className="pb-1">
          <SidebarGroupContent>
            <NewTask />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* My Lists */}
        <NavLists />

        {/* Tags */}
        <SidebarTags />
      </SidebarContent>

      {/* Focus + account */}
      <SidebarFooter className="gap-3">
        <FocusCard />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
