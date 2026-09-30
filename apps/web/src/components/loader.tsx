import { PersonalOsLogo } from "@/components/personal-os-logo";

/** Compact branded pending state for in-app / non-auth route loads. */
export default function Loader() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-svh w-full flex-col items-center justify-center gap-5 bg-background"
      role="status"
    >
      <span className="sr-only">Carregando PersonalOS…</span>
      <PersonalOsLogo markClassName="size-10" withWordmark />
      <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-full origin-left animate-pulse rounded-full bg-foreground/35" />
      </div>
    </div>
  );
}
