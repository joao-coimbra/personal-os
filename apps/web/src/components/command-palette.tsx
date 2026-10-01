// biome-ignore-all lint/performance/noJsxPropsBind: command item onSelect handlers
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@personal-os/ui/components/command";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useUiStore } from "@/stores/ui-store";

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setOperatorOpen = useUiStore((s) => s.setOperatorOpen);
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <CommandInput placeholder="Buscar ações…" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        <CommandGroup heading="Ações">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              setOperatorOpen(true);
            }}
          >
            Abrir AI Operator
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate({ search: {}, to: "/integrations" });
            }}
          >
            Integrações
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate({ to: "/tasks" });
            }}
          >
            Tasks
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate({ to: "/calendar" });
            }}
          >
            Calendar
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navegação">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate({ to: "/" });
            }}
          >
            Home
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              navigate({ to: "/settings" });
            }}
          >
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
