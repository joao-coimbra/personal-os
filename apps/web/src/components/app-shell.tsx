import { Button } from "@personal-os/ui/components/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@personal-os/ui/components/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Calendar,
  FileText,
  FolderOpen,
  Home,
  ListTodo,
  Plug,
  Settings,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { PersonalOsLogo } from "@/components/personal-os-logo";
import { OperatorSheet } from "@/features/operator/operator-sheet";
import { useUiStore } from "@/stores/ui-store";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const mainNav = [
  { icon: Home, label: "Home", to: "/home" },
  { icon: ListTodo, label: "Tasks", to: "/tasks" },
  { icon: Calendar, label: "Calendar", to: "/calendar" },
  { icon: FileText, label: "Notes", to: "/notes" },
  { icon: FolderOpen, label: "Files", to: "/files" },
  { icon: BarChart3, label: "Analytics", to: "/analytics" },
] as const;

const secondaryNav = [
  { icon: Plug, label: "Integrations", to: "/integrations" },
  { icon: Settings, label: "Settings", to: "/settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const setOperatorOpen = useUiStore((s) => s.setOperatorOpen);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-b px-2 py-3">
          <div className="px-2">
            <PersonalOsLogo markClassName="size-6" withWordmark />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={pathname === item.to}
                      render={<Link to={item.to} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNav.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={pathname === item.to}
                      render={
                        <Link
                          search={item.to === "/integrations" ? {} : undefined}
                          to={item.to}
                        />
                      }
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-2">
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button
              onClick={() => setOperatorOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Sparkles className="size-4" />
              AI
            </Button>
            <ModeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
      <OperatorSheet />
      <CommandPalette />
    </SidebarProvider>
  );
}
