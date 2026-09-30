import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@personal-os/ui/components/reui/stepper";
import { CheckIcon } from "lucide-react";
import { type OnboardingStep, SIDEBAR_STEP_DESCRIPTIONS } from "./data";

// Shared so the compact mobile rail and the vertical sidebar rail read as the
// same component at every breakpoint.
const INDICATOR_CLASSNAME =
  "size-4 bg-transparent text-transparent ring-1 ring-white/35 data-[state=active]:bg-transparent data-[state=active]:ring-white/65 data-[state=completed]:bg-white data-[state=completed]:text-slate-950 data-[state=completed]:ring-white/75";

const SEPARATOR_COLOR_CLASSNAME =
  "bg-white/20 group-data-[state=completed]/step:bg-white/55";

const COMPLETED_INDICATOR = <CheckIcon aria-hidden="true" className="size-3" />;

function StepIndicatorContent({
  step,
  currentStep,
  isComplete,
}: {
  step: OnboardingStep;
  currentStep: number;
  isComplete: boolean;
}) {
  return step.value === currentStep && !isComplete ? (
    <span aria-hidden="true" className="block size-1.5 rounded-full bg-white" />
  ) : (
    <span className="sr-only">{step.value}</span>
  );
}

/**
 * Compact horizontal rail for small screens. Stacking the full vertical rail
 * above the form pushes the first field below the fold on a phone, so mobile
 * gets the active step label, a step counter, and a tappable dot rail instead.
 */
export function OnboardingStepperCompact({
  currentStep,
  isComplete,
  onStepChange,
  steps,
}: {
  currentStep: number;
  isComplete: boolean;
  onStepChange: (step: number) => void;
  steps: OnboardingStep[];
}) {
  const activeStep = steps.find((step) => step.value === currentStep);

  return (
    <Stepper
      className="flex w-full flex-col gap-2.5"
      indicators={{ completed: COMPLETED_INDICATOR }}
      onValueChange={onStepChange}
      orientation="horizontal"
      value={currentStep}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-medium text-[0.8125rem] text-white leading-4">
          {isComplete ? "Setup complete" : activeStep?.label}
        </p>
        <p className="shrink-0 text-white/60 text-xs tabular-nums leading-4">
          {isComplete
            ? `${steps.length} of ${steps.length}`
            : `Step ${currentStep} of ${steps.length}`}
        </p>
      </div>

      <StepperNav aria-label="Onboarding progress" className="w-full">
        {steps.map((step) => (
          <StepperItem
            className="items-center"
            completed={isComplete || currentStep > step.value}
            key={step.id}
            step={step.value}
          >
            {/* -my-2 py-2 keeps the row 16px tall while giving the dot a 32px
                tap target. */}
            <StepperTrigger
              aria-label={`Step ${step.value}: ${step.label}`}
              className="-my-2 shrink-0 py-2 focus-visible:ring-white/45"
            >
              <StepperIndicator className={INDICATOR_CLASSNAME}>
                <StepIndicatorContent
                  currentStep={currentStep}
                  isComplete={isComplete}
                  step={step}
                />
              </StepperIndicator>
            </StepperTrigger>
            {step.value < steps.length ? (
              <StepperSeparator
                className={`${SEPARATOR_COLOR_CLASSNAME} mx-1.5`}
              />
            ) : null}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  );
}

export function OnboardingStepper({
  currentStep,
  isComplete,
  onStepChange,
  steps,
}: {
  currentStep: number;
  isComplete: boolean;
  onStepChange: (step: number) => void;
  steps: OnboardingStep[];
}) {
  return (
    <Stepper
      className="flex w-full flex-col items-start justify-center gap-0"
      indicators={{ completed: COMPLETED_INDICATOR }}
      onValueChange={onStepChange}
      orientation="vertical"
      value={currentStep}
    >
      <StepperNav aria-label="Onboarding progress" className="w-full">
        {steps.map((step) => {
          const description =
            SIDEBAR_STEP_DESCRIPTIONS[step.id] ?? step.description;

          return (
            <StepperItem
              className="relative not-last:flex-1 items-start"
              completed={isComplete || currentStep > step.value}
              key={step.id}
              step={step.value}
            >
              <StepperTrigger className="w-full items-start gap-3 pb-5 text-left last:pb-0">
                <StepperIndicator className={`${INDICATOR_CLASSNAME} mt-0.5`}>
                  <StepIndicatorContent
                    currentStep={currentStep}
                    isComplete={isComplete}
                    step={step}
                  />
                </StepperIndicator>
                <div className="min-w-0 flex-1 text-left">
                  <StepperTitle className="!text-[0.8125rem] !leading-4 text-white data-[state=completed]:text-white/88 data-[state=inactive]:text-white/72">
                    {step.label}
                  </StepperTitle>
                  <StepperDescription className="!text-xs !leading-4 mt-0.5 max-w-none text-white/50 data-[state=active]:text-white/60">
                    {description}
                  </StepperDescription>
                </div>
              </StepperTrigger>
              {step.value < steps.length ? (
                <StepperSeparator
                  className={`${SEPARATOR_COLOR_CLASSNAME} !h-[calc(100%-1.75rem)] absolute top-6 bottom-1 left-2 -order-1 m-0 w-px -translate-x-1/2`}
                />
              ) : null}
            </StepperItem>
          );
        })}
      </StepperNav>
    </Stepper>
  );
}
