import { Button } from "@personal-os/ui/components/button";
import { SidebarTrigger } from "@personal-os/ui/components/sidebar";
import { Sparkles } from "lucide-react";

import { useAiAssistant } from "./ai-assistant";
import { ORG } from "./data";
import { Logo } from "./logo";

// Slim top bar shown only on mobile. The sidebar trigger opens the primitive's
// drawer (which carries the full sidebar, including the account menu); the
// Sparkles button opens the AI assistant Sheet.
export function MobileHeader() {
  const { toggle } = useAiAssistant();

  return (
    <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5 md:hidden">
      <SidebarTrigger />
      <a aria-label={ORG.name} className="flex items-center gap-2" href="#">
        <Logo />
        <span className="font-medium text-sm">{ORG.name}</span>
      </a>
      <Button
        aria-label="Open AI assistant"
        className="ml-auto"
        onClick={toggle}
        size="icon-sm"
        variant="ghost"
      >
        <Sparkles aria-hidden="true" />
      </Button>
    </header>
  );
}
