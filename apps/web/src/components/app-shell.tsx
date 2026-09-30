import { Button } from "@personal-os/ui/components/button";
import { Progress } from "@personal-os/ui/components/progress";
import { Badge } from "@personal-os/ui/components/reui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@personal-os/ui/components/sheet";
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
import { cn } from "@personal-os/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CalendarDays,
  Clock,
  FileText,
  Flag,
  FolderOpen,
  Home,
  ListChecks,
  ListTodo,
  Plug,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

import { CommandPalette } from "@/components/command-palette";
import { PersonalOsLogo } from "@/components/personal-os-logo";
import { OperatorChat } from "@/features/operator/operator-chat";
import { useUiStore } from "@/stores/ui-store";
import { orpc } from "@/utils/orpc";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const LG_BREAKPOINT = 1024;

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

const QUADRANT_DOT: Record<string, string> = {
  delegate: "bg-blue-500",
  do: "bg-rose-500",
  eliminate: "bg-emerald-500",
  schedule: "bg-amber-500",
};

const QUADRANT_LABEL: Record<string, string> = {
  delegate: "Delegar",
  do: "Fazer",
  eliminate: "Eliminar",
  schedule: "Agendar",
};

function useIsBelowLg() {
  const [below, setBelow] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`);
    const onChange = () => setBelow(window.innerWidth < LG_BREAKPOINT);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return below;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const operatorOpen = useUiStore((s) => s.operatorOpen);
  const setOperatorOpen = useUiStore((s) => s.setOperatorOpen);
  const closeOperator = useUiStore((s) => s.closeOperator);
  const toggleOperator = useUiStore((s) => s.toggleOperator);
  const belowLg = useIsBelowLg();
  const overview = useQuery(orpc.dashboard.getOverview.queryOptions());

  const pendingCount = overview.data?.pendingCount ?? 0;
  const overdueCount = overview.data?.overdueCount ?? 0;
  const events = overview.data?.eventsUpcoming ?? [];
  const prefs = overview.data?.preferences;
  const priorityTasks = overview.data?.priorityTasks ?? [];

  const quadrantCounts = {
    delegate: priorityTasks.filter((t) => t.quadrant === "delegate").length,
    do: priorityTasks.filter((t) => t.quadrant === "do").length,
    eliminate: priorityTasks.filter((t) => t.quadrant === "eliminate").length,
    schedule: priorityTasks.filter((t) => t.quadrant === "schedule").length,
  };

  const focusMinutes = prefs?.focusMinutes ?? 50;
  const breakMinutes = prefs?.breakMinutes ?? 15;
  const focusTotal = Math.max(pendingCount, 1);
  const focusDone = Math.max(focusTotal - overdueCount, 0);
  const focusPct = Math.round((focusDone / focusTotal) * 100);

  const inFlowOpen = !belowLg && operatorOpen;
  const sheetOpen = belowLg && operatorOpen;

  const taskLists = [
    {
      count: pendingCount,
      icon: ListChecks,
      id: "all",
      label: "Todas",
      to: "/tasks" as const,
    },
    {
      count: overdueCount,
      icon: AlertCircle,
      id: "overdue",
      label: "Atrasadas",
      to: "/tasks" as const,
    },
    {
      count: events.length,
      icon: CalendarDays,
      id: "agenda",
      label: "Agenda",
      to: "/calendar" as const,
    },
    {
      count: priorityTasks.length,
      icon: Flag,
      id: "priority",
      label: "Prioridade",
      to: "/tasks" as const,
    },
  ];

  return (
    <SidebarProvider
      className="h-svh bg-muted"
      style={
        {
          "--header-height": "56px",
          "--sidebar": "var(--background)",
          "--sidebar-width": "250px",
        } as CSSProperties
      }
    >
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader className="flex h-(--header-height) flex-row items-center px-2.5">
          <Link className="flex items-center gap-2 overflow-hidden" to="/home">
            <PersonalOsLogo markClassName="size-6" />
            <span className="truncate font-medium text-sm group-data-[collapsible=icon]:hidden">
              PersonalOS
            </span>
          </Link>
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
                      tooltip={item.label}
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
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
              Listas
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {taskLists.map((list) => (
                  <SidebarMenuItem key={list.id}>
                    <SidebarMenuButton
                      isActive={pathname === list.to && list.id !== "agenda"}
                      render={<Link to={list.to} />}
                      tooltip={`${list.label} (${list.count})`}
                    >
                      <list.icon />
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

          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Eisenhower</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="flex flex-wrap gap-1.5 px-2 pt-1">
                {(["do", "schedule", "delegate", "eliminate"] as const).map(
                  (q) => (
                    <Link
                      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                      key={q}
                      to="/tasks"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          QUADRANT_DOT[q]
                        )}
                      />
                      {QUADRANT_LABEL[q]}
                      <span className="text-muted-foreground tabular-nums">
                        {quadrantCounts[q]}
                      </span>
                    </Link>
                  )
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Próximos eventos</SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              {events.length === 0 ? (
                <p className="px-1 text-muted-foreground text-xs leading-relaxed">
                  Conecte o Google Calendar para ver a agenda aqui.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {events.slice(0, 4).map((event) => (
                    <li key={event.id}>
                      <Link
                        className="block rounded-md border bg-background/60 px-2 py-1.5 transition-colors hover:bg-accent/40"
                        to="/calendar"
                      >
                        <p className="truncate font-medium text-xs">
                          {event.summary ?? "Evento"}
                        </p>
                        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="size-2.5" />
                          {event.start.dateTime ?? event.start.date}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
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
                      tooltip={item.label}
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

        <SidebarFooter className="gap-3">
          <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
            <div className="space-y-2.5 rounded-xl border border-dashed bg-muted/40 p-3">
              <div className="flex items-center justify-between font-medium text-muted-foreground text-xs">
                <span>Foco</span>
                <span className="text-foreground tabular-nums">
                  {focusMinutes}m / pausa {breakMinutes}m
                </span>
              </div>
              <Progress
                aria-label="Progresso de foco"
                className="h-1.5"
                value={focusPct}
              />
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground text-sm">
                  {overdueCount > 0
                    ? `${overdueCount} atrasadas`
                    : `${pendingCount} pendentes`}
                </p>
                <p className="text-muted-foreground text-xs">
                  {events[0]
                    ? `Próximo: ${events[0].summary ?? "evento"}`
                    : "Sem eventos nos próximos dias"}
                </p>
              </div>
            </div>
          </SidebarGroup>
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="m-2 flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background shadow-xs md:ml-0">
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-3 md:px-4">
          <SidebarTrigger />
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button
              aria-pressed={operatorOpen}
              className="gap-1.5"
              onClick={toggleOperator}
              size="sm"
              type="button"
              variant={operatorOpen ? "secondary" : "outline"}
            >
              <Sparkles className="size-4" />
              <span className="hidden sm:inline">AI</span>
            </Button>
            <ModeToggle />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>

      {belowLg ? (
        <Sheet onOpenChange={setOperatorOpen} open={sheetOpen}>
          <SheetContent
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
            side="right"
          >
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4" />
                PersonalOS AI
              </SheetTitle>
              <SheetDescription className="text-left text-xs">
                Operador sobre Trello, Calendar e Notion conectados.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1">
              <OperatorChat />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <aside
          aria-hidden={!inFlowOpen}
          aria-label="Assistente AI"
          className={cn(
            "h-svh shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
            inFlowOpen ? "w-[320px]" : "w-0"
          )}
          inert={!inFlowOpen}
        >
          <div className="my-2 me-2 flex h-[calc(100%-1rem)] w-[312px] flex-col overflow-hidden rounded-lg border bg-background shadow-xs">
            <div className="flex h-(--header-height) shrink-0 items-center justify-between gap-2 border-b px-4">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="size-3.5" />
                </span>
                <h2 className="font-medium text-sm">PersonalOS AI</h2>
              </div>
              <Button
                aria-label="Fechar assistente"
                onClick={closeOperator}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <OperatorChat />
            </div>
          </div>
        </aside>
      )}

      <CommandPalette />
    </SidebarProvider>
  );
}
