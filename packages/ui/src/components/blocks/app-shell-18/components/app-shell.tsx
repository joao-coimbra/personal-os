import { MainContent } from "./main-content";
import { SidebarShell } from "./sidebar-shell";

export function AppShell() {
  return (
    <SidebarShell>
      <MainContent />
    </SidebarShell>
  );
}
