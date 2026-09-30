"use client";

import { HowItWorks } from "@personal-os/ui/components/blocks/how-it-works-4/components/how-it-works";
import { Button } from "@personal-os/ui/components/button";
import { Checkbox } from "@personal-os/ui/components/checkbox";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "@personal-os/ui/components/combobox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@personal-os/ui/components/field";
import { Input } from "@personal-os/ui/components/input";
import { Item, ItemGroup } from "@personal-os/ui/components/item";
import { Frame, FramePanel } from "@personal-os/ui/components/reui/frame";
import { IconStack } from "@personal-os/ui/components/reui/icon-stack";
import { Spinner } from "@personal-os/ui/components/spinner";
import { CircleCheckIcon, RocketIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useState,
} from "react";
import {
  AI_PROMPT_EXAMPLES,
  FOCUS_GOAL_OPTIONS,
  type FocusGoalValue,
  ONBOARDING_STEPS,
  TIMEZONE_GROUPS,
} from "./data";
import { OnboardingPageBackground } from "./onboarding-background";
import { OnboardingHeader } from "./onboarding-header";
import {
  OnboardingStepper,
  OnboardingStepperCompact,
} from "./onboarding-stepper";

const TOTAL_STEPS = ONBOARDING_STEPS.length;

/** Shared column for every onboarding step — keeps width/height stable across transitions. */
const STEP_COLUMN = "mx-auto flex w-full max-w-xl flex-col lg:min-h-[32rem]";

const stepMotion = (direction: 1 | -1, reduce: boolean | null) =>
  reduce
    ? {
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        initial: { opacity: 1 },
        transition: { duration: 0 },
      }
    : {
        animate: {
          filter: "blur(0px)",
          opacity: 1,
          scale: 1,
          x: 0,
        },
        exit: {
          filter: "blur(3px)",
          opacity: 0,
          scale: 0.998,
          x: direction > 0 ? -10 : 10,
        },
        initial: {
          filter: "blur(4px)",
          opacity: 0,
          scale: 0.998,
          x: direction > 0 ? 14 : -14,
        },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

export type PersonalOsOnboardingPreferences = {
  breakMinutes: string;
  focusMinutes: string;
  timezone: string;
  workEnd: string;
  workStart: string;
};

export type PersonalOsOnboardingProps = {
  integrationsContent: ReactNode;
  isFinishing?: boolean;
  isSavingPreferences?: boolean;
  onFinish: () => void;
  onSavePreferences: (
    prefs: PersonalOsOnboardingPreferences
  ) => Promise<void> | void;
  preferences?: Partial<PersonalOsOnboardingPreferences>;
};

function StepHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div aria-live="polite" className="flex flex-col gap-1.5">
      <h1 className="text-balance font-semibold text-foreground text-xl leading-7 sm:text-[1.375rem]">
        {title}
      </h1>
      <p className="text-pretty text-muted-foreground text-sm leading-5">
        {description}
      </p>
    </div>
  );
}

function WelcomeStep({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div aria-live="polite" className="flex flex-col gap-5">
      <StepHeading description={description} title={title} />
      <HowItWorks embedded />
    </div>
  );
}

function PreferencesStep({
  breakMinutes,
  focusMinutes,
  onBreakMinutesChange,
  onFocusMinutesChange,
  onTimezoneChange,
  onWorkEndChange,
  onWorkStartChange,
  timezone,
  workEnd,
  workStart,
}: {
  breakMinutes: string;
  focusMinutes: string;
  onBreakMinutesChange: (value: string) => void;
  onFocusMinutesChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onWorkEndChange: (value: string) => void;
  onWorkStartChange: (value: string) => void;
  timezone: string;
  workEnd: string;
  workStart: string;
}) {
  return (
    <FieldSet>
      <FieldLegend className="sr-only">Preferências de ritmo</FieldLegend>
      <FieldGroup className="gap-4">
        <Field className="gap-2">
          <FieldLabel htmlFor="personalos-timezone">Timezone</FieldLabel>
          <Combobox
            defaultValue={timezone}
            items={[...TIMEZONE_GROUPS]}
            onValueChange={(value) => {
              if (typeof value === "string" && value.length > 0) {
                onTimezoneChange(value);
              }
            }}
          >
            <ComboboxInput
              className="w-full"
              id="personalos-timezone"
              placeholder="Selecione o timezone"
            />
            <ComboboxContent className="w-(--anchor-width) min-w-(--anchor-width)">
              <ComboboxEmpty>Nenhum timezone encontrado.</ComboboxEmpty>
              <ComboboxList>
                {(group) => (
                  <ComboboxGroup items={[...group.items]} key={group.value}>
                    <ComboboxLabel>{group.value}</ComboboxLabel>
                    <ComboboxCollection>
                      {(item) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                    <ComboboxSeparator className="group-last/combobox-group:hidden" />
                  </ComboboxGroup>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="gap-2">
            <FieldLabel htmlFor="personalos-work-start">Início</FieldLabel>
            <Input
              id="personalos-work-start"
              onChange={(event) => onWorkStartChange(event.target.value)}
              type="time"
              value={workStart}
            />
          </Field>
          <Field className="gap-2">
            <FieldLabel htmlFor="personalos-work-end">Término</FieldLabel>
            <Input
              id="personalos-work-end"
              onChange={(event) => onWorkEndChange(event.target.value)}
              type="time"
              value={workEnd}
            />
          </Field>
          <Field className="gap-2">
            <FieldLabel htmlFor="personalos-focus">Focus (min)</FieldLabel>
            <Input
              id="personalos-focus"
              inputMode="numeric"
              onChange={(event) => onFocusMinutesChange(event.target.value)}
              value={focusMinutes}
            />
          </Field>
          <Field className="gap-2">
            <FieldLabel htmlFor="personalos-break">Pausa (min)</FieldLabel>
            <Input
              id="personalos-break"
              inputMode="numeric"
              onChange={(event) => onBreakMinutesChange(event.target.value)}
              value={breakMinutes}
            />
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  );
}

function GoalsStep({
  goals,
  onGoalToggle,
}: {
  goals: FocusGoalValue[];
  onGoalToggle: (goal: FocusGoalValue, checked: boolean) => void;
}) {
  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">Selecione uma ou mais</FieldLegend>
      <ItemGroup className="gap-2">
        {FOCUS_GOAL_OPTIONS.map((option) => {
          const selected = goals.includes(option.value);
          const fieldId = `personalos-goal-${option.value}`;

          return (
            <Item key={option.value} size="sm" variant="outline">
              <Field className="w-full gap-3" orientation="horizontal">
                <Checkbox
                  checked={selected}
                  id={fieldId}
                  onCheckedChange={(checked) =>
                    onGoalToggle(option.value, checked === true)
                  }
                />
                <FieldLabel
                  className="items-start leading-snug"
                  htmlFor={fieldId}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-muted-foreground [&_svg]:size-4">
                      {option.icon}
                    </span>
                    {option.label}
                  </span>
                  <span className="mt-0.5 block font-normal text-muted-foreground text-xs">
                    {option.description}
                  </span>
                </FieldLabel>
              </Field>
            </Item>
          );
        })}
      </ItemGroup>
    </FieldSet>
  );
}

function AiStep() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm leading-6">
        Experimente estes pedidos depois de entrar no dashboard:
      </p>
      <ul className="flex flex-col gap-2">
        {AI_PROMPT_EXAMPLES.map((prompt) => (
          <li
            className="rounded-xl border bg-muted/40 px-4 py-3 text-sm"
            key={prompt}
          >
            “{prompt}”
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuccessStep({
  isFinishing,
  onEnter,
  onReviewSetup,
}: {
  isFinishing: boolean;
  onEnter: () => void;
  onReviewSetup: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center">
        <div
          aria-hidden="true"
          className="mx-auto flex h-28 w-full items-center justify-center"
        >
          <IconStack
            className="h-24 w-22 text-primary"
            style={
              {
                "--icon-stack-content-x": "70%",
                "--icon-stack-content-y": "57%",
              } as CSSProperties
            }
          >
            <CircleCheckIcon
              aria-hidden="true"
              className="size-5 text-primary"
              strokeWidth="1.8"
            />
          </IconStack>
        </div>

        <div className="mx-auto mt-3 max-w-sm text-center">
          <h1 className="font-semibold text-2xl text-foreground leading-8 tracking-tight">
            Tudo pronto
          </h1>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            Dashboard, tarefas e operador já estão disponíveis. Clientes MCP
            (Cursor, Claude) ficam em Integrações.
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        <Button
          className="w-full"
          disabled={isFinishing}
          onClick={onEnter}
          type="button"
        >
          {isFinishing ? (
            <Spinner aria-hidden="true" data-icon="inline-start" />
          ) : (
            <RocketIcon aria-hidden="true" data-icon="inline-start" />
          )}
          Entrar no PersonalOS
        </Button>
        <Button
          className="w-full"
          disabled={isFinishing}
          onClick={onReviewSetup}
          type="button"
          variant="ghost"
        >
          Revisar setup
        </Button>
      </div>
    </div>
  );
}

function OnboardingSidebar({
  canGoBack,
  currentStep,
  isComplete,
  onBack,
  onStepChange,
}: {
  canGoBack: boolean;
  currentStep: number;
  isComplete: boolean;
  onBack: () => void;
  onStepChange: (step: number) => void;
}) {
  return (
    <aside className="relative z-10 flex w-full shrink-0 border-b px-5 pt-5 pb-4 sm:px-8 sm:pt-6 sm:pb-5 lg:min-h-svh lg:w-[18rem] lg:border-b-0 lg:py-7 lg:pr-5 lg:pl-7">
      <div className="flex min-h-full w-full flex-col">
        <OnboardingHeader canGoBack={canGoBack} onBack={onBack} />

        <div className="mt-4 lg:hidden">
          <OnboardingStepperCompact
            currentStep={currentStep}
            isComplete={isComplete}
            onStepChange={onStepChange}
            steps={ONBOARDING_STEPS}
          />
        </div>

        <div className="hidden flex-1 items-center justify-center py-16 lg:flex">
          <OnboardingStepper
            currentStep={currentStep}
            isComplete={isComplete}
            onStepChange={onStepChange}
            steps={ONBOARDING_STEPS}
          />
        </div>

        <div aria-hidden="true" className="hidden h-8 shrink-0 lg:block" />
      </div>
    </aside>
  );
}

export function Onboarding({
  integrationsContent,
  isFinishing = false,
  isSavingPreferences = false,
  onFinish,
  onSavePreferences,
  preferences,
}: PersonalOsOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [timezone, setTimezone] = useState(
    preferences?.timezone ?? "America/Sao_Paulo"
  );
  const [workStart, setWorkStart] = useState(preferences?.workStart ?? "09:00");
  const [workEnd, setWorkEnd] = useState(preferences?.workEnd ?? "18:00");
  const [focusMinutes, setFocusMinutes] = useState(
    preferences?.focusMinutes ?? "50"
  );
  const [breakMinutes, setBreakMinutes] = useState(
    preferences?.breakMinutes ?? "15"
  );
  const [goals, setGoals] = useState<FocusGoalValue[]>([
    "prioritize",
    "timeblock",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const shouldReduceMotion = useReducedMotion();

  const currentStepMeta: (typeof ONBOARDING_STEPS)[number] =
    ONBOARDING_STEPS[currentStep - 1] ?? ONBOARDING_STEPS[0]!;
  const isFinalStep = currentStep === TOTAL_STEPS;
  const busy = isSubmitting || isSavingPreferences || isFinishing;
  const canContinue =
    (currentStepMeta.id !== "goals" || goals.length > 0) &&
    (currentStepMeta.id !== "preferences" ||
      (timezone.trim().length > 0 &&
        workStart.trim().length > 0 &&
        workEnd.trim().length > 0));
  // Skip only on goals: Continuar requires a selection there.
  // Integrations has no selection requirement, so Continuar alone advances.
  const showSkip = currentStepMeta.id === "goals";

  function goToStep(step: number) {
    const nextStep = Math.min(Math.max(step, 1), TOTAL_STEPS);
    setTransitionDirection(nextStep >= currentStep ? 1 : -1);
    setIsComplete(false);
    setCurrentStep(nextStep);
  }

  function handleGoalToggle(goal: FocusGoalValue, checked: boolean) {
    setGoals((currentGoals) => {
      if (checked) {
        return currentGoals.includes(goal)
          ? currentGoals
          : [...currentGoals, goal];
      }
      return currentGoals.filter((currentGoal) => currentGoal !== goal);
    });
  }

  function handleSkip() {
    if (!showSkip) {
      return;
    }
    if (isFinalStep) {
      setTransitionDirection(1);
      setIsComplete(true);
      return;
    }
    goToStep(currentStep + 1);
  }

  function handleStepNavigation(step: number) {
    if (isComplete || step <= currentStep) {
      goToStep(step);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue || busy) {
      return;
    }

    if (currentStepMeta.id === "preferences") {
      setIsSubmitting(true);
      try {
        await onSavePreferences({
          breakMinutes,
          focusMinutes,
          timezone,
          workEnd,
          workStart,
        });
        goToStep(currentStep + 1);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!isFinalStep) {
      goToStep(currentStep + 1);
      return;
    }

    setTransitionDirection(1);
    setIsComplete(true);
  }

  const motionProps = stepMotion(transitionDirection, shouldReduceMotion);

  return (
    <main className="relative isolate flex min-h-svh w-full flex-col bg-muted/20 text-foreground lg:flex-row">
      <OnboardingPageBackground />

      <OnboardingSidebar
        canGoBack={!isComplete && currentStep > 1}
        currentStep={currentStep}
        isComplete={isComplete}
        onBack={() => goToStep(currentStep - 1)}
        onStepChange={handleStepNavigation}
      />

      <section className="relative z-10 flex min-w-0 flex-1 p-3 sm:p-6 lg:py-6 lg:pr-5 lg:pl-0">
        <Frame
          className="flex w-full flex-1 gap-0 overflow-hidden bg-muted/60 [--frame-px:--spacing(1.25)] [--frame-py:--spacing(1.25)] lg:min-h-[calc(100svh-3rem)] dark:bg-muted/10"
          spacing="xs"
          variant="ghost"
        >
          <FramePanel className="flex flex-1 flex-col border-border/40 px-5 py-8 sm:px-10 sm:py-14 md:py-16 lg:px-14 lg:py-20 xl:py-24">
            <div className="flex flex-1">
              <AnimatePresence initial={false} mode="wait">
                {isComplete ? (
                  <motion.div
                    className={STEP_COLUMN}
                    key="success"
                    {...motionProps}
                  >
                    <SuccessStep
                      isFinishing={isFinishing}
                      onEnter={onFinish}
                      onReviewSetup={() => {
                        setTransitionDirection(-1);
                        setIsComplete(false);
                        setCurrentStep(TOTAL_STEPS);
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.form
                    className={STEP_COLUMN}
                    key={currentStepMeta.id}
                    onSubmit={handleSubmit}
                    {...motionProps}
                  >
                    <div className="flex flex-col gap-8">
                      {currentStepMeta.id === "welcome" ? (
                        <WelcomeStep
                          description={currentStepMeta.description}
                          title={currentStepMeta.title}
                        />
                      ) : (
                        <StepHeading
                          description={currentStepMeta.description}
                          title={currentStepMeta.title}
                        />
                      )}

                      {currentStepMeta.id === "integrations" ? (
                        <div className="flex flex-col gap-3">
                          {integrationsContent}
                        </div>
                      ) : null}

                      {currentStepMeta.id === "preferences" ? (
                        <PreferencesStep
                          breakMinutes={breakMinutes}
                          focusMinutes={focusMinutes}
                          onBreakMinutesChange={setBreakMinutes}
                          onFocusMinutesChange={setFocusMinutes}
                          onTimezoneChange={setTimezone}
                          onWorkEndChange={setWorkEnd}
                          onWorkStartChange={setWorkStart}
                          timezone={timezone}
                          workEnd={workEnd}
                          workStart={workStart}
                        />
                      ) : null}

                      {currentStepMeta.id === "goals" ? (
                        <GoalsStep
                          goals={goals}
                          onGoalToggle={handleGoalToggle}
                        />
                      ) : null}

                      {currentStepMeta.id === "ai" ? <AiStep /> : null}
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-8">
                      <Button
                        className="w-full"
                        disabled={!canContinue || busy}
                        type="submit"
                      >
                        {busy ? (
                          <Spinner
                            aria-hidden="true"
                            data-icon="inline-start"
                          />
                        ) : isFinalStep ? (
                          <RocketIcon
                            aria-hidden="true"
                            data-icon="inline-start"
                          />
                        ) : null}
                        {isFinalStep
                          ? "Concluir setup"
                          : currentStepMeta.id === "welcome"
                            ? "Começar"
                            : "Continuar"}
                      </Button>

                      {showSkip ? (
                        <Button
                          className="w-full"
                          disabled={busy}
                          onClick={handleSkip}
                          type="button"
                          variant="ghost"
                        >
                          Pular
                        </Button>
                      ) : null}
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </FramePanel>
        </Frame>
      </section>
    </main>
  );
}
