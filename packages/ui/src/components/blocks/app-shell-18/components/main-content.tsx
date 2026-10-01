import { Search, Sparkles } from "lucide-react";

("use client");

import { Button } from "@personal-os/ui/components/button";
import { Input } from "@personal-os/ui/components/input";
import { Kbd } from "@personal-os/ui/components/kbd";
import { SidebarTrigger } from "@personal-os/ui/components/sidebar";

import { useAiAssistant } from "./ai-assistant";

// The center surface is intentionally a set of placeholder blocks - an app-shell
// block ships the chrome (sidebar + assistant + header), not a finished page.
export function MainContent() {
  const { open, toggle } = useAiAssistant();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex h-(--header-height) items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ms-1.5 hidden md:inline-flex" />
          <h1 className="font-semibold text-base">All Tasks</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Search tasks"
              className="h-8 w-44 pl-8 lg:w-56"
              placeholder="Search tasks"
              type="search"
            />
            <Kbd className="absolute top-1/2 right-2 -translate-y-1/2">⌘K</Kbd>
          </div>

          <Button
            aria-pressed={open}
            className="hidden gap-1.5 md:inline-flex"
            onClick={toggle}
            size="sm"
            variant={open ? "secondary" : "outline"}
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Assistant
          </Button>
        </div>
      </div>

      {/* Placeholder blocks */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="aspect-video rounded-xl border border-border/60 border-dashed bg-muted/40" />
          <div className="aspect-video rounded-xl border border-border/60 border-dashed bg-muted/40" />
          <div className="aspect-video rounded-xl border border-border/60 border-dashed bg-muted/40" />
        </div>
        <div className="min-h-64 flex-1 rounded-xl border border-border/60 border-dashed bg-muted/40" />
      </div>
    </div>
  );
}
