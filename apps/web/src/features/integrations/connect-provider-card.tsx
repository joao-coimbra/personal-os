/** Page cards bind connect/disconnect handlers from parent lists. */
// biome-ignore-all lint/performance/noJsxPropsBind: intentional event props on Item actions

import { Button } from "@personal-os/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@personal-os/ui/components/item";
import { Spinner } from "@personal-os/ui/components/spinner";
import { cn } from "@personal-os/ui/lib/utils";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import {
  type AiModelProvider,
  type IntegrationProvider,
  type OAuthIntegrationProvider,
  startOAuth,
} from "@/lib/oauth";

const API_KEY_PROVIDERS = new Set<AiModelProvider>(["anthropic", "openai"]);

export interface ConnectProviderCardProps {
  description: string;
  isConnected: boolean;
  isPending?: boolean;
  logo: ReactNode;
  name: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  provider: IntegrationProvider;
  returnTo?: string;
  secondaryAction?: ReactNode;
}

const connectedLabel = (
  <span className="inline-flex items-center gap-1 font-normal text-emerald-700 text-xs dark:text-emerald-400">
    <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
    Conectado
  </span>
);

export function ConnectProviderCard({
  description,
  isConnected,
  isPending,
  logo,
  name,
  onConnect,
  onDisconnect,
  provider,
  returnTo = "/integrations",
  secondaryAction,
}: ConnectProviderCardProps) {
  return (
    <Item
      className={cn(
        "items-center gap-3",
        isConnected && "border-emerald-500/35 bg-emerald-500/[0.03]"
      )}
      size="sm"
      variant="outline"
    >
      <ItemMedia
        className="flex size-10 shrink-0 items-center justify-center self-center rounded-xl border border-border/80 bg-background text-foreground shadow-none [&_svg]:size-5"
        variant="default"
      >
        {logo}
      </ItemMedia>

      <ItemContent className="min-w-0 flex-1 gap-0.5">
        <ItemTitle className="gap-2">
          <span>{name}</span>
          {isConnected ? connectedLabel : null}
        </ItemTitle>
        <ItemDescription className="line-clamp-2 text-xs leading-relaxed sm:text-sm">
          {description}
        </ItemDescription>
      </ItemContent>

      <ItemActions className="ms-auto flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
        {secondaryAction}
        <ProviderActions
          isConnected={isConnected}
          isPending={isPending}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          provider={provider}
          returnTo={returnTo}
        />
      </ItemActions>
    </Item>
  );
}

function ProviderActions({
  isConnected,
  isPending,
  onConnect,
  onDisconnect,
  provider,
  returnTo,
}: {
  isConnected: boolean;
  isPending?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  provider: IntegrationProvider;
  returnTo: string;
}) {
  if (isConnected) {
    if (!onDisconnect) {
      return null;
    }

    return (
      <Button
        className="w-full sm:w-auto"
        onClick={onDisconnect}
        size="sm"
        type="button"
        variant="ghost"
      >
        Desconectar
      </Button>
    );
  }

  const handleConnect = () => {
    if (onConnect) {
      onConnect();
      return;
    }
    if (API_KEY_PROVIDERS.has(provider as AiModelProvider)) {
      return;
    }
    startOAuth(provider as OAuthIntegrationProvider, returnTo);
  };

  return (
    <Button
      className="w-full sm:w-auto"
      disabled={isPending}
      onClick={handleConnect}
      size="sm"
      type="button"
      variant="outline"
    >
      {isPending ? <Spinner className="size-3.5" /> : null}
      Conectar
    </Button>
  );
}
