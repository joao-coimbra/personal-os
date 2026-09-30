import { GithubDark } from "@personal-os/ui/components/svgs/githubDark";
import { GithubLight } from "@personal-os/ui/components/svgs/githubLight";
import { Google } from "@personal-os/ui/components/svgs/google";
import { GoogleCalendar } from "@personal-os/ui/components/svgs/googleCalendar";
import { Notion } from "@personal-os/ui/components/svgs/notion";
import { Trello } from "@personal-os/ui/components/svgs/trello";
import type { ReactNode } from "react";

export interface AuthProvider {
  id: "google" | "github";
  label: string;
  logo: ReactNode;
}

export interface AuthCapability {
  icon: ReactNode;
  id: string;
  name: string;
}

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

/** Product integrations shown on the auth footer — brand marks, not generic icons. */
export const AUTH16_CAPABILITIES: AuthCapability[] = [
  {
    icon: <Trello aria-hidden="true" className="size-4" />,
    id: "trello",
    name: "Trello",
  },
  {
    icon: <GoogleCalendar aria-hidden="true" className="size-4" />,
    id: "google_calendar",
    name: "Google Calendar",
  },
  {
    icon: <Notion aria-hidden="true" className="size-4" />,
    id: "notion",
    name: "Notion",
  },
];
