import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@personal-os/ui/components/avatar";
import { Button } from "@personal-os/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@personal-os/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@personal-os/ui/components/sidebar";
import { cn } from "@personal-os/ui/lib/utils";
import {
  ChevronsUpDown,
  CircleCheck,
  LifeBuoy,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { USER } from "./data";

// ── Theme toggle ──

const THEMES = [
  {
    icon: <Sun aria-hidden="true" className="size-3.5" />,
    label: "Light",
    value: "light",
  },
  {
    icon: <Moon aria-hidden="true" className="size-3.5" />,
    label: "Dark",
    value: "dark",
  },
  {
    icon: <Monitor aria-hidden="true" className="size-3.5" />,
    label: "System",
    value: "system",
  },
];

function ThemeSegmentedToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme ?? "system") : "system";

  return (
    <div
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5"
      role="radiogroup"
    >
      {THEMES.map(({ value, label, icon }) => {
        const isActive = currentTheme === value;
        return (
          <Button
            aria-checked={isActive}
            aria-label={label}
            className={cn(
              "rounded-full",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={value}
            onClick={() => setTheme(value)}
            role="radio"
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            {icon}
          </Button>
        );
      })}
    </div>
  );
}

// ── Menu sections ──

function UserMenuHeader() {
  return (
    <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
      <Avatar className="size-8">
        <AvatarImage alt={USER.name} src={USER.avatar} />
        <AvatarFallback>{USER.initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="font-semibold text-foreground text-sm">
          {USER.name}
        </span>
        <span className="truncate font-normal text-muted-foreground text-xs">
          {USER.email}
        </span>
      </div>
    </DropdownMenuLabel>
  );
}

function UserMenuAccount() {
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <User aria-hidden="true" />
        Profile
        <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Settings aria-hidden="true" />
        Preferences
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

function UserMenuTasks() {
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem>
        <ListChecks aria-hidden="true" />
        My Tasks
      </DropdownMenuItem>
      <DropdownMenuItem>
        <CircleCheck aria-hidden="true" />
        Completed
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

function UserMenuTheme() {
  return (
    <DropdownMenuGroup>
      {/* The swatches set a value in place, so the menu outlives the click. */}
      <DropdownMenuItem
        className="cursor-default focus:bg-transparent!"
        closeOnClick={false}
      >
        <Palette aria-hidden="true" />
        Theme
        <div className="ml-auto">
          <ThemeSegmentedToggle />
        </div>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

function UserMenuContent() {
  const { isMobile } = useSidebar();

  return (
    <DropdownMenuContent
      align="end"
      className="w-60"
      side={isMobile ? "top" : "right"}
      sideOffset={8}
    >
      <DropdownMenuGroup>
        <UserMenuHeader />
        <DropdownMenuSeparator />
        <UserMenuAccount />
        <DropdownMenuSeparator />
        <UserMenuTasks />
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LifeBuoy aria-hidden="true" />
          Help & Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <UserMenuTheme />
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut aria-hidden="true" />
          Sign Out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  );
}

// ── Nav user ──

export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                aria-label="Open user menu"
                className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
                size="lg"
              />
            }
          >
            <Avatar className="size-7 shrink-0">
              <AvatarImage alt={USER.name} src={USER.avatar} />
              <AvatarFallback>{USER.initials}</AvatarFallback>
              <AvatarBadge className="-end-0.5 -top-0.5 bottom-auto size-2 bg-success ring-background" />
            </Avatar>
            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold text-sm">
                {USER.name}
              </span>
              <span className="truncate text-muted-foreground text-xs">
                {USER.email}
              </span>
            </div>
            <ChevronsUpDown
              aria-hidden="true"
              className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden"
            />
          </DropdownMenuTrigger>

          <UserMenuContent />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
