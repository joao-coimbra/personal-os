import { Button } from "@personal-os/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@personal-os/ui/components/collapsible";
import { Progress } from "@personal-os/ui/components/progress";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@personal-os/ui/components/resizable";
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@personal-os/ui/components/sidebar";
import { cn } from "@personal-os/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  Home,
  ListTodo,
  Plug,
  Settings,
  Sparkles,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

import { CommandPalette } from "@/components/command-palette";
import { PersonalOsLogo } from "@/components/personal-os-logo";
import { OperatorChat } from "@/features/operator/operator-chat";
import { OperatorDraftPanel } from "@/features/operator/operator-draft-panel";
import { useUiStore } from "@/stores/ui-store";
import { orpc } from "@/utils/orpc";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const LG_BREAKPOINT = 1024;

const homeNav = { icon: Home, label: "Home", to: "/" as const };

const otherMainNav = [
  { icon: Calendar, label: "Calendar", to: "/calendar" as const },
  { icon: FileText, label: "Notes", to: "/notes" as const },
  { icon: FolderOpen, label: "Files", to: "/files" as const },
  { icon: BarChart3, label: "Analytics", to: "/analytics" as const },
] as const;

const taskSubNav = [
  {
    filter: "today" as const,
    icon: CalendarCheck2,
    label: "Hoje",
  },
  {
    filter: "scheduled" as const,
    icon: CalendarClock,
    label: "Agendadas",
  },
  {
    filter: "completed" as const,
    icon: CheckCircle2,
    label: "Completas",
  },
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

function isHomePath(pathname: string) {
  return pathname === "/" || pathname === "/home";
}

function TasksNavItem({
  pathname,
  taskFilter,
}: {
  pathname: string;
  taskFilter?: string;
}) {
  const onTasks = pathname === "/tasks" || pathname.startsWith("/tasks/");
  const [open, setOpen] = useState(onTasks);

  useEffect(() => {
    if (onTasks) {
      setOpen(true);
    }
  }, [onTasks]);

  return (
    <Collapsible
      className="group/collapsible"
      onOpenChange={setOpen}
      open={open}
    >
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={onTasks && !taskFilter}
          render={<Link search={{}} to="/tasks" />}
          tooltip="Tasks"
        >
          <ListTodo />
          <span>Tasks</span>
        </SidebarMenuButton>
        <CollapsibleTrigger
          render={
            <SidebarMenuAction
              aria-label={open ? "Recolher Tasks" : "Expandir Tasks"}
              className="data-panel-open:rotate-90"
            />
          }
        >
          <ChevronRight />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {taskSubNav.map((item) => (
              <SidebarMenuSubItem key={item.filter}>
                <SidebarMenuSubButton
                  isActive={onTasks && taskFilter === item.filter}
                  render={<Link search={{ filter: item.filter }} to="/tasks" />}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

interface OverviewEvent {
  id: string;
  start: { dateTime?: string | null; date?: string | null };
  summary?: string | null;
}

interface PriorityTask {
  quadrant?: string | null;
}

function EisenhowerSection({
  priorityTasks,
}: {
  priorityTasks: PriorityTask[];
}) {
  const quadrantCounts = {
    delegate: priorityTasks.filter((t) => t.quadrant === "delegate").length,
    do: priorityTasks.filter((t) => t.quadrant === "do").length,
    eliminate: priorityTasks.filter((t) => t.quadrant === "eliminate").length,
    schedule: priorityTasks.filter((t) => t.quadrant === "schedule").length,
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Eisenhower</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="flex flex-wrap gap-1.5 px-2 pt-1">
          {(["do", "schedule", "delegate", "eliminate"] as const).map((q) => (
            <Link
              className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
              key={q}
              search={{}}
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
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function UpcomingEventsSection({ events }: { events: OverviewEvent[] }) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Próximos eventos</SidebarGroupLabel>
      <SidebarGroupContent className="px-2">
        {events.length === 0 ? (
          <p className="px-1 text-muted-foreground text-xs leading-relaxed">
            Conecte o Google Calendar para ver a agenda aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
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
  );
}

function FocusFooterCard({
  breakMinutes,
  events,
  focusMinutes,
  overdueCount,
  pendingCount,
}: {
  breakMinutes: number;
  events: OverviewEvent[];
  focusMinutes: number;
  overdueCount: number;
  pendingCount: number;
}) {
  const focusTotal = Math.max(pendingCount, 1);
  const focusDone = Math.max(focusTotal - overdueCount, 0);
  const focusPct = Math.round((focusDone / focusTotal) * 100);

  return (
    <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
      <div className="flex flex-col gap-2.5 rounded-xl border border-dashed bg-muted/40 p-3">
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
        <div className="flex flex-col gap-0.5">
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
  );
}

function ShellHeader({
  operatorOpen,
  onToggleOperator,
}: {
  operatorOpen: boolean;
  onToggleOperator: () => void;
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-3 md:px-4">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-end gap-2">
        <Button
          aria-pressed={operatorOpen}
          className="gap-1.5"
          onClick={onToggleOperator}
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
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const taskFilter = useRouterState({
    select: (s) => {
      const { filter } = s.location.search as { filter?: unknown };
      return typeof filter === "string" ? filter : undefined;
    },
  });
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
  const sheetOpen = belowLg && operatorOpen;

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
          <Link className="flex items-center gap-2 overflow-hidden" to="/">
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
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isHomePath(pathname)}
                    render={<Link to={homeNav.to} />}
                    tooltip={homeNav.label}
                  >
                    <homeNav.icon />
                    <span>{homeNav.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <TasksNavItem pathname={pathname} taskFilter={taskFilter} />
                {otherMainNav.map((item) => (
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

          <EisenhowerSection priorityTasks={priorityTasks} />
          <UpcomingEventsSection events={events} />

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
          <FocusFooterCard
            breakMinutes={prefs?.breakMinutes ?? 15}
            events={events}
            focusMinutes={prefs?.focusMinutes ?? 50}
            overdueCount={overdueCount}
            pendingCount={pendingCount}
          />
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {belowLg ? (
        <>
          <SidebarInset className="m-2 flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background shadow-xs md:ml-0">
            <ShellHeader
              onToggleOperator={toggleOperator}
              operatorOpen={operatorOpen}
            />
            <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
              <OperatorDraftPanel />
              {children}
            </main>
          </SidebarInset>

          <Sheet onOpenChange={setOperatorOpen} open={sheetOpen}>
            <SheetContent
              className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
              showCloseButton={false}
              side="right"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>PersonalOS AI</SheetTitle>
                <SheetDescription>
                  Operador sobre Trello, Calendar e Notion conectados.
                </SheetDescription>
              </SheetHeader>
              <OperatorChat onClose={closeOperator} overlay />
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <ResizablePanelGroup
          className="min-h-0 min-w-0 flex-1"
          orientation="horizontal"
        >
          <ResizablePanel
            defaultSize={operatorOpen ? "70" : "100"}
            id="main"
            minSize={operatorOpen ? "42" : "100"}
          >
            <SidebarInset className="m-2 flex h-[calc(100%-1rem)] min-h-0 flex-col overflow-hidden rounded-lg border bg-background shadow-xs md:ml-0">
              <ShellHeader
                onToggleOperator={toggleOperator}
                operatorOpen={operatorOpen}
              />
              <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
                <OperatorDraftPanel />
                {children}
              </main>
            </SidebarInset>
          </ResizablePanel>

          {operatorOpen ? (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize="30"
                id="operator"
                maxSize="48"
                minSize="22"
              >
                <aside
                  aria-label="Assistente AI"
                  className="my-2 me-2 flex h-[calc(100%-1rem)] min-h-0 flex-col overflow-hidden rounded-lg border bg-background shadow-xs"
                >
                  <OperatorChat onClose={closeOperator} />
                </aside>
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      )}

      <CommandPalette />
    </SidebarProvider>
  );
}
