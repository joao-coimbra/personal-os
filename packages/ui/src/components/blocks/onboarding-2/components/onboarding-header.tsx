import { Button } from "@personal-os/ui/components/button";
import { ArrowLeftIcon } from "lucide-react";
import { OnboardingLogo } from "./onboarding-logo";

export function OnboardingHeader({
  canGoBack,
  onBack,
}: {
  canGoBack: boolean;
  onBack: () => void;
}) {
  return (
    <header className="relative z-10 flex min-h-8 shrink-0 items-center justify-between gap-4">
      <OnboardingLogo />

      {canGoBack ? (
        <Button
          aria-label="Voltar ao passo anterior"
          onClick={onBack}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
          Voltar
        </Button>
      ) : null}
    </header>
  );
}
