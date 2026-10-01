"use client";

import {
  SidebarInset,
  SidebarProvider,
} from "@personal-os/ui/components/sidebar";
import type { CSSProperties, ReactNode } from "react";

import { AiAssistant, AiAssistantProvider } from "./ai-assistant";
import { AppSidebar } from "./app-sidebar";
import { MobileHeader } from "./mobile-header";

// ─────────────────────────────────────────────────────────────────────────────
// SidebarShell
//
// Three floating panels on a muted backdrop. The left sidebar is the ReUI
// Sidebar primitive (floating variant, icon collapse, mobile drawer, Cmd/Ctrl+B
// all owned by the primitive). The right AI assistant rides its own context so
// the two panels toggle independently. The body inset is the main surface.
//
// The sidebar surface is pinned to --background so it reads as a clean white
// (or true dark) card against the muted backdrop, which also lets the nav
// hover/active states stand out instead of blending into a gray-on-gray.
// ─────────────────────────────────────────────────────────────────────────────

export function SidebarShell({ children }: { children: ReactNode }) {
  return (
    <AiAssistantProvider>
      <SidebarProvider
        className="h-svh bg-muted"
        style={
          {
            // Shared chrome height for the sidebar, content, and assistant headers.
            "--header-height": "56px",
            "--sidebar": "var(--background)",
            "--sidebar-width": "250px",
          } as CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset className="m-2 flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background shadow-xs md:ml-0">
          <MobileHeader />
          {children}
        </SidebarInset>
        <AiAssistant />
      </SidebarProvider>
    </AiAssistantProvider>
  );
}
