import { AnthropicBlackWordmark } from "@personal-os/ui/components/svgs/anthropicBlackWordmark";
import { AnthropicWhiteWordmark } from "@personal-os/ui/components/svgs/anthropicWhiteWordmark";
import { GithubDark } from "@personal-os/ui/components/svgs/githubDark";
import { GithubLight } from "@personal-os/ui/components/svgs/githubLight";
import { Google } from "@personal-os/ui/components/svgs/google";
import { NvidiaWordmarkDark } from "@personal-os/ui/components/svgs/nvidiaWordmarkDark";
import { NvidiaWordmarkLight } from "@personal-os/ui/components/svgs/nvidiaWordmarkLight";
import { OpenaiWordmarkDark } from "@personal-os/ui/components/svgs/openaiWordmarkDark";
import { OpenaiWordmarkLight } from "@personal-os/ui/components/svgs/openaiWordmarkLight";
import { ResendWordmarkBlack } from "@personal-os/ui/components/svgs/resendWordmarkBlack";
import { ResendWordmarkWhite } from "@personal-os/ui/components/svgs/resendWordmarkWhite";
import { SupabaseWordmarkDark } from "@personal-os/ui/components/svgs/supabaseWordmarkDark";
import { SupabaseWordmarkLight } from "@personal-os/ui/components/svgs/supabaseWordmarkLight";
import type { ReactNode } from "react";

export type AuthProvider = {
  id: "google" | "github";
  label: string;
  logo: ReactNode;
};

export type TrustBrand = {
  id: string;
  logo: ReactNode;
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

export const AUTH16_TRUST_BRANDS: TrustBrand[] = [
  {
    id: "anthropic",
    logo: (
      <ThemeLogo
        dark={
          <AnthropicWhiteWordmark aria-hidden="true" className="h-3 w-auto" />
        }
        light={
          <AnthropicBlackWordmark aria-hidden="true" className="h-3 w-auto" />
        }
      />
    ),
    name: "Anthropic",
  },
  {
    id: "supabase",
    logo: (
      <ThemeLogo
        dark={
          <SupabaseWordmarkDark aria-hidden="true" className="h-4 w-auto" />
        }
        light={
          <SupabaseWordmarkLight aria-hidden="true" className="h-4 w-auto" />
        }
      />
    ),
    name: "Supabase",
  },
  {
    id: "nvidia",
    logo: (
      <ThemeLogo
        dark={
          <NvidiaWordmarkDark aria-hidden="true" className="h-3.5 w-auto" />
        }
        light={
          <NvidiaWordmarkLight aria-hidden="true" className="h-3.5 w-auto" />
        }
      />
    ),
    name: "NVIDIA",
  },
  {
    id: "resend",
    logo: (
      <ThemeLogo
        dark={<ResendWordmarkWhite aria-hidden="true" className="h-3 w-auto" />}
        light={
          <ResendWordmarkBlack aria-hidden="true" className="h-3 w-auto" />
        }
      />
    ),
    name: "Resend",
  },
  {
    id: "openai",
    logo: (
      <ThemeLogo
        dark={<OpenaiWordmarkDark aria-hidden="true" className="h-4 w-auto" />}
        light={
          <OpenaiWordmarkLight aria-hidden="true" className="h-4 w-auto" />
        }
      />
    ),
    name: "OpenAI",
  },
];
