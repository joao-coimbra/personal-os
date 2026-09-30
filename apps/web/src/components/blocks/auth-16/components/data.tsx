import { GithubDark } from "@personal-os/ui/components/svgs/githubDark";
import { GithubLight } from "@personal-os/ui/components/svgs/githubLight";
import { Google } from "@personal-os/ui/components/svgs/google";
import { CalendarDays, Kanban, NotebookPen } from "lucide-react";
import type { ReactNode } from "react";

export type AuthProvider = {
  id: "google" | "github";
  label: string;
  logo: ReactNode;
};

export type AuthCapability = {
  id: string;
  icon: ReactNode;
  name: string;
};

function ThemeLogo({ light, dark }: { dark: ReactNode; light: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="dark:hidden">
        {light}
      </span>
      <span aria-hidden="true" className="hidden dark:block">
        {dark}
      </span>
    </>
  );
}

export const AUTH16_PROVIDERS: AuthProvider[] = [
  {
    id: "google",
    label: "Continuar com Google",
    logo: <Google aria-hidden="true" data-icon="inline-start" />,
  },
  {
    id: "github",
    label: "Continuar com GitHub",
    logo: (
      <ThemeLogo
        dark={<GithubDark aria-hidden="true" data-icon="inline-start" />}
        light={<GithubLight aria-hidden="true" data-icon="inline-start" />}
      />
    ),
  },
];

/** Product integrations shown on the auth footer — not sponsor marks. */
export const AUTH16_CAPABILITIES: AuthCapability[] = [
  {
    icon: <Kanban aria-hidden="true" className="size-3.5" />,
    id: "trello",
    name: "Trello",
  },
  {
    icon: <CalendarDays aria-hidden="true" className="size-3.5" />,
    id: "google_calendar",
    name: "Google Calendar",
  },
  {
    icon: <NotebookPen aria-hidden="true" className="size-3.5" />,
    id: "notion",
    name: "Notion",
  },
];
