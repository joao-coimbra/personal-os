import { Button } from "@personal-os/ui/components/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@personal-os/ui/components/field";
import { Input } from "@personal-os/ui/components/input";
import { Separator } from "@personal-os/ui/components/separator";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  getSocialAuthRedirects,
  messageForAuthError,
} from "@/lib/auth-redirects";

import { AUTH16_PROVIDERS } from "./data";
import { useLoginSearch } from "./use-login-search";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const { error: authError } = useLoginSearch();
  const reportedAuthError = useRef<string | null>(null);

  useEffect(() => {
    if (!authError || reportedAuthError.current === authError) {
      return;
    }
    reportedAuthError.current = authError;
    const message = messageForAuthError(authError);
    if (message) {
      toast.error(message);
    }
  }, [authError]);

  const handleSocial = (provider: "google" | "github") => {
    setPendingProvider(provider);
    const { callbackURL, errorCallbackURL } = getSocialAuthRedirects();
    void authClient.signIn.social(
      {
        callbackURL,
        errorCallbackURL,
        provider,
      },
      {
        onError: (error) => {
          setPendingProvider(null);
          toast.error(
            error.error.message ||
              `Não foi possível entrar com ${provider === "google" ? "Google" : "GitHub"}.`
          );
        },
      }
    );
  };

  const handleMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    const { callbackURL, errorCallbackURL } = getSocialAuthRedirects();
    setIsSendingLink(true);
    await authClient.signIn.magicLink(
      {
        callbackURL,
        email: trimmed,
        errorCallbackURL,
        newUserCallbackURL: callbackURL,
      },
      {
        onError: (error) => {
          setIsSendingLink(false);
          toast.error(
            error.error.message ||
              "Não foi possível enviar o link. Verifique o e-mail e tente de novo."
          );
        },
        onSuccess: () => {
          setIsSendingLink(false);
          setLinkSent(true);
          toast.success("Link enviado. Confira sua caixa de entrada.");
        },
      }
    );
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-balance font-semibold text-2xl tracking-tight sm:text-[1.6875rem]">
          De volta ao foco.
        </h1>
        <p className="text-pretty text-muted-foreground text-sm">
          Entre para sincronizar tarefas, agenda e o operador de IA em um só
          lugar.
        </p>
      </div>

      <div className="grid gap-2.5">
        {AUTH16_PROVIDERS.map((provider) => (
          <Button
            className="w-full justify-center px-4 [&_svg:not([class*='size-'])]:size-4"
            disabled={pendingProvider !== null || isSendingLink}
            key={provider.id}
            onClick={() => handleSocial(provider.id)}
            type="button"
            variant="outline"
          >
            {pendingProvider === provider.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              provider.logo
            )}
            {provider.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">ou</span>
        <Separator className="flex-1" />
      </div>

      {linkSent ? (
        <div className="rounded-xl border bg-muted/40 px-4 py-5 text-center">
          <p className="font-medium text-sm">Verifique seu e-mail</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Enviamos um link mágico para <strong>{email}</strong>. Abra-o neste
            dispositivo para entrar.
          </p>
          <Button
            className="mt-4"
            onClick={() => setLinkSent(false)}
            type="button"
            variant="ghost"
          >
            Usar outro e-mail
          </Button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleMagicLink}>
          <FieldGroup>
            <Field className="gap-2">
              <FieldLabel htmlFor="auth-16-email">
                E-mail de trabalho
              </FieldLabel>
              <Input
                autoComplete="email"
                id="auth-16-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                type="email"
                value={email}
              />
            </Field>
          </FieldGroup>

          <Button
            className="w-full"
            disabled={isSendingLink || pendingProvider !== null}
            type="submit"
          >
            {isSendingLink ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Continuar
                <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
              </>
            )}
          </Button>
        </form>
      )}

      <p className="text-pretty text-center text-muted-foreground text-xs leading-5">
        Ao continuar, você concorda com os{" "}
        <Link
          className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          to="/terms"
        >
          Termos de Serviço
        </Link>{" "}
        e a{" "}
        <Link
          className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          to="/privacy"
        >
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  );
}
