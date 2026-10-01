import { Card } from "@personal-os/ui/components/card";
import { Badge } from "@personal-os/ui/components/reui/badge";
import { Showcase } from "./showcase";

export function HowItWorks({
  embedded = false,
}: {
  /** Compact card for the onboarding welcome step (showcase only). */
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <section
        aria-label="Como o PersonalOS funciona"
        className="@container w-full"
      >
        <Card className="w-full gap-0 overflow-hidden p-0 shadow-none">
          <Showcase compact />
        </Card>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="how-it-works-4-title"
      className="w-full bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8"
    >
      <div className="@container mx-auto w-full max-w-7xl">
        <Card className="w-full gap-0 overflow-hidden p-0">
          <div className="flex flex-col items-center gap-6 border-b p-6">
            <Badge radius="full" size="xl" variant="outline">
              Como funciona
            </Badge>

            <h2
              className="text-balance text-center font-semibold @2xl:text-4xl text-3xl text-foreground"
              id="how-it-works-4-title"
            >
              Do setup ao operador
            </h2>

            <p className="max-w-[40rem] text-pretty text-center text-muted-foreground text-sm">
              Conecte ferramentas, defina o ritmo e deixe o operador priorizar e
              planejar com o seu contexto — sem colar tokens.
            </p>
          </div>

          <Showcase />
        </Card>
      </div>
    </section>
  );
}
