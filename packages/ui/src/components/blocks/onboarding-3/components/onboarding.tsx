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
import { IconStack } from "@personal-os/ui/components/reui/icon-stack";
import { Spinner } from "@personal-os/ui/components/spinner";
import { cn } from "cn";
import {
  ArrowLeftIcon,
  CircleCheckIcon,
  RocketIcon,
  SparklesIcon,
} from "lucide-react";
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
import { DotSphere } from "./dot-sphere";
import { OnboardingLogo } from "./onboarding-logo";
import {
  OnboardingStepper,
  OnboardingStepperCompact,
} from "./onboarding-stepper";

const TOTAL_STEPS = ONBOARDING_STEPS.length;

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
    <div aria-live="polite" className="flex max-w-[30rem] flex-col gap-1.5">
      <h1 className="text-balance font-semibold text-foreground text-xl leading-7 sm:text-[1.375rem]">
        {title}
      </h1>
      <p className="text-pretty text-muted-foreground text-sm leading-5">
        {description}
      </p>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-sm">
        <SparklesIcon aria-hidden="true" className="size-4" />
        Setup em poucos minutos
      </div>
      <p className="text-muted-foreground text-sm leading-6">
        Trello para tarefas, Calendar para blocos de foco, Notion para notas. O
        operador de IA usa essas conexões — sem colar tokens.
      </p>
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
            items={[...TIMEZONE_GROUPS]}
            onValueChange={(value) => {
              if (typeof value === "string" && value.length > 0) {
                onTimezoneChange(value);
              }
            }}
            value={timezone}
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
    <aside className="relative z-10 flex w-full shrink-0 px-4 py-4 sm:px-5 sm:py-5 lg:min-h-svh lg:w-[22rem] lg:px-5 lg:py-5">
      <div className="dark relative isolate flex min-h-full w-full overflow-hidden rounded-2xl bg-background px-5 py-5 text-foreground ring-1 ring-border">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden bg-background"
        >
          <DotSphere
            dotGap={19}
            dotRadiusMax={1.9}
            motion="wave"
            speed={0.4}
            sphereCount={5}
            sphereRadius="20%"
          />
        </div>

        <div className="relative flex min-h-full w-full flex-col">
          <header className="flex min-h-9 items-center justify-between gap-3">
            <OnboardingLogo className="[&>svg]:shrink-0 [&_span]:text-slate-50" />
            {canGoBack ? (
              <Button
                aria-label="Voltar ao passo anterior"
                className="text-white/65 hover:bg-white/10 hover:text-white"
                onClick={onBack}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <ArrowLeftIcon aria-hidden="true" />
              </Button>
            ) : null}
          </header>

          <div className="mt-4 lg:hidden">
            <OnboardingStepperCompact
              currentStep={currentStep}
              isComplete={isComplete}
              onStepChange={onStepChange}
              steps={ONBOARDING_STEPS}
            />
          </div>

          <div className="hidden flex-1 items-center justify-center px-2 py-16 lg:flex">
            <OnboardingStepper
              currentStep={currentStep}
              isComplete={isComplete}
              onStepChange={onStepChange}
              steps={ONBOARDING_STEPS}
            />
          </div>

          <footer className="mt-5 flex min-h-8 shrink-0 items-end justify-between gap-4 text-xs lg:mt-0">
            <a
              className="rounded-sm text-left text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              href="/privacy"
            >
              Privacidade
            </a>
            <a
              className="rounded-sm text-right text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              href="/integrations"
            >
              Integrações
            </a>
          </footer>
        </div>
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
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepMeta: (typeof ONBOARDING_STEPS)[number] =
    ONBOARDING_STEPS[currentStep - 1] ?? ONBOARDING_STEPS[0]!;
  const isFinalStep = currentStep === TOTAL_STEPS;
  const canSkip = Boolean(currentStepMeta.optional) || currentStep === 4;
  const busy = isSubmitting || isSavingPreferences || isFinishing;
  const canContinue =
    (currentStepMeta.id !== "goals" || goals.length > 0) &&
    (currentStepMeta.id !== "preferences" ||
      (timezone.trim().length > 0 &&
        workStart.trim().length > 0 &&
        workEnd.trim().length > 0));

  function goToStep(step: number) {
    setIsComplete(false);
    setCurrentStep(Math.min(Math.max(step, 1), TOTAL_STEPS));
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
    if (!(canSkip || currentStepMeta.id === "integrations")) {
      return;
    }
    if (isFinalStep) {
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

    setIsComplete(true);
  }

  return (
    <main className="relative isolate flex min-h-svh w-full flex-col bg-background text-foreground lg:flex-row">
      <OnboardingSidebar
        canGoBack={!isComplete && currentStep > 1}
        currentStep={currentStep}
        isComplete={isComplete}
        onBack={() => goToStep(currentStep - 1)}
        onStepChange={handleStepNavigation}
      />

      <section className="relative z-10 flex min-w-0 flex-1 items-center justify-center px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
        <div className="flex w-full max-w-[28rem] flex-col lg:min-h-[36rem]">
          {isComplete ? (
            <SuccessStep
              isFinishing={isFinishing}
              onEnter={onFinish}
              onReviewSetup={() => {
                setIsComplete(false);
                setCurrentStep(TOTAL_STEPS);
              }}
            />
          ) : (
            <form
              className="flex min-h-[inherit] flex-col"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-8 pt-2 sm:pt-6">
                <StepHeading
                  description={currentStepMeta.description}
                  title={currentStepMeta.title}
                />

                {currentStepMeta.id === "welcome" ? <WelcomeStep /> : null}

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
                  <GoalsStep goals={goals} onGoalToggle={handleGoalToggle} />
                ) : null}

                {currentStepMeta.id === "ai" ? <AiStep /> : null}
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-10 pb-2">
                <Button
                  className="w-full"
                  disabled={!canContinue || busy}
                  type="submit"
                >
                  {busy ? (
                    <Spinner aria-hidden="true" data-icon="inline-start" />
                  ) : isFinalStep ? (
                    <RocketIcon aria-hidden="true" data-icon="inline-start" />
                  ) : null}
                  {isFinalStep ? "Concluir setup" : "Continuar"}
                </Button>

                {currentStepMeta.id === "integrations" ||
                currentStepMeta.id === "goals" ? (
                  <Button
                    className={cn("w-full")}
                    disabled={busy}
                    onClick={handleSkip}
                    type="button"
                    variant="ghost"
                  >
                    Pular
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
