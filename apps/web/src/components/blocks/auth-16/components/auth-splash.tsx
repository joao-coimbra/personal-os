import { Button } from "@personal-os/ui/components/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@personal-os/ui/components/field";
import { Separator } from "@personal-os/ui/components/separator";
import { Skeleton } from "@personal-os/ui/components/skeleton";
import { ArrowRightIcon } from "lucide-react";

import { AuthFooter } from "./auth-footer";
import { AuthHeader } from "./auth-header";
import { AUTH16_PROVIDERS } from "./data";

/** Login-shaped pending splash — real chrome, inert actions, skeleton email field. */
export function AuthSplash() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-svh w-full bg-background"
      role="status"
    >
      <span className="sr-only">Carregando PersonalOS…</span>
      <div className="flex min-h-svh w-full flex-col">
        <AuthHeader />
        <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-8 sm:py-12">
          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-1.5 text-center">
              <h1 className="text-balance font-semibold text-2xl tracking-tight sm:text-[1.6875rem]">
                De volta ao foco.
              </h1>
              <p className="text-pretty text-muted-foreground text-sm">
                Entre para sincronizar tarefas, agenda e o operador de IA em um
                só lugar.
              </p>
            </div>

            <div className="grid gap-2.5">
              {AUTH16_PROVIDERS.map((provider) => (
                <Button
                  aria-disabled="true"
                  className="w-full justify-center px-4 [&_svg:not([class*='size-'])]:size-4"
                  disabled
                  key={provider.id}
                  tabIndex={-1}
                  type="button"
                  variant="outline"
                >
                  {provider.logo}
                  {provider.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-muted-foreground text-xs">ou</span>
              <Separator className="flex-1" />
            </div>

            <div className="flex flex-col gap-4">
              <FieldGroup>
                <Field className="gap-2">
                  <FieldLabel>E-mail de trabalho</FieldLabel>
                  <Skeleton
                    aria-hidden="true"
                    className="h-9 w-full rounded-4xl"
                  />
                </Field>
              </FieldGroup>

              <Button
                aria-disabled="true"
                className="w-full"
                disabled
                tabIndex={-1}
                type="button"
              >
                Continuar
                <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
              </Button>
            </div>

            <p className="text-pretty text-center text-muted-foreground text-xs leading-5">
              Ao continuar, você concorda com os Termos de Serviço e a Política
              de Privacidade.
            </p>
          </div>
        </main>
        <AuthFooter />
      </div>
    </div>
  );
}
