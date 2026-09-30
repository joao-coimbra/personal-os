import { Onboarding } from "./components/onboarding";

/** Demo shell — wire integrations via apps/web onboarding route. */
export function Page() {
  return (
    <Onboarding
      integrationsContent={
        <p className="text-muted-foreground text-sm">
          Conecte Trello, Google Calendar e Notion no app.
        </p>
      }
      onFinish={() => undefined}
      onSavePreferences={() => undefined}
    />
  );
}
