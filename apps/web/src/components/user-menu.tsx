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
import { Skeleton } from "@personal-os/ui/components/skeleton";
import { cn } from "@personal-os/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronsUpDown,
  CircleCheck,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useTheme } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";

const THEMES = [
  {
    icon: <Sun aria-hidden="true" className="size-3.5" />,
    label: "Claro",
    value: "light",
  },
  {
    icon: <Moon aria-hidden="true" className="size-3.5" />,
    label: "Escuro",
    value: "dark",
  },
  {
    icon: <Monitor aria-hidden="true" className="size-3.5" />,
    label: "Sistema",
    value: "system",
  },
] as const;

const WHITESPACE_RE = /\s+/;

function initialsFromName(name: string): string {
  const parts = name.trim().split(WHITESPACE_RE).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function ThemeSegmentedToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme ?? "system") : "system";

  return (
    <div
      aria-label="Tema"
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
            // Theme swatches keep the menu open; bind is intentional per option.
            // biome-ignore lint/performance/noJsxPropsBind: per-theme option handlers
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

function UserMenuHeader({
  email,
  image,
  name,
}: {
  email: string;
  image?: string | null;
  name: string;
}) {
  return (
    <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
      <Avatar className="size-8">
        {image ? <AvatarImage alt={name} src={image} /> : null}
        <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="font-semibold text-foreground text-sm">{name}</span>
        <span className="truncate font-normal text-muted-foreground text-xs">
          {email}
        </span>
      </div>
    </DropdownMenuLabel>
  );
}

function UserMenuContent({
  email,
  image,
  name,
  onSignOut,
}: {
  email: string;
  image?: string | null;
  name: string;
  onSignOut: () => void;
}) {
  const { isMobile } = useSidebar();

  return (
    <DropdownMenuContent
      align="end"
      className="w-60"
      side={isMobile ? "top" : "right"}
      sideOffset={8}
    >
      <DropdownMenuGroup>
        <UserMenuHeader email={email} image={image} name={name} />
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/settings" />}>
          <User aria-hidden="true" />
          Perfil
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/settings" />}>
          <Settings aria-hidden="true" />
          Preferências
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link search={{}} to="/tasks" />}>
          <ListChecks aria-hidden="true" />
          Minhas tasks
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link search={{ filter: "completed" }} to="/tasks" />}
        >
          <CircleCheck aria-hidden="true" />
          Completas
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-default focus:bg-transparent!"
          closeOnClick={false}
        >
          <Palette aria-hidden="true" />
          Tema
          <div className="ml-auto">
            <ThemeSegmentedToggle />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} variant="destructive">
          <LogOut aria-hidden="true" />
          Sair
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  );
}

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton className="h-12 w-full rounded-xl" />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!session) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton render={<Link to="/login" />} size="lg">
            Entrar
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const { email, image, name } = session.user;
  const displayName = name || email;

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/" });
        },
      },
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                aria-label="Abrir menu do usuário"
                className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
                size="lg"
              />
            }
          >
            <Avatar className="size-7 shrink-0">
              {image ? <AvatarImage alt={displayName} src={image} /> : null}
              <AvatarFallback>{initialsFromName(displayName)}</AvatarFallback>
              <AvatarBadge className="-end-0.5 -top-0.5 bottom-auto size-2 bg-success ring-background" />
            </Avatar>
            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold text-sm">
                {displayName}
              </span>
              <span className="truncate text-muted-foreground text-xs">
                {email}
              </span>
            </div>
            <ChevronsUpDown
              aria-hidden="true"
              className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden"
            />
          </DropdownMenuTrigger>
          <UserMenuContent
            email={email}
            image={image}
            name={displayName}
            onSignOut={handleSignOut}
          />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
