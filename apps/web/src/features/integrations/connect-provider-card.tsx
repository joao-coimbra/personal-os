import { Badge } from "@personal-os/ui/components/badge";
import { Button } from "@personal-os/ui/components/button";
import { cn } from "@personal-os/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { type IntegrationProvider, startOAuth } from "@/lib/oauth";

export interface ConnectProviderCardProps {
  accentClassName: string;
  description: string;
  icon: LucideIcon;
  isConnected: boolean;
  isPending?: boolean;
  name: string;
  onDisconnect?: () => void;
  provider: IntegrationProvider;
  returnTo?: string;
}

export function ConnectProviderCard({
  accentClassName,
  description,
  icon: Icon,
  isConnected,
  isPending,
  name,
  onDisconnect,
  provider,
  returnTo = "/integrations",
}: ConnectProviderCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur transition hover:shadow-md",
        isConnected && "border-emerald-500/40"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-8 -right-8 size-32 rounded-full opacity-30 blur-2xl",
          accentClassName
        )}
      />
      <div className="relative flex items-start gap-4">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl text-white shadow-inner",
            accentClassName
          )}
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-base tracking-tight">{name}</h3>
              <p className="mt-0.5 text-muted-foreground text-sm">
                {description}
              </p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          {isConnected ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 text-sm dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                Pronto para o operador
              </span>
              {onDisconnect && (
                <Button
                  onClick={onDisconnect}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Desconectar
                </Button>
              )}
            </div>
          ) : (
            <Button
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={() => startOAuth(provider, returnTo)}
              size="lg"
              type="button"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Conectar {name}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
