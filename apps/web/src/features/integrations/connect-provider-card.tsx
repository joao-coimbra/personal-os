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

import { type IntegrationProvider, startOAuth } from "@/lib/oauth";

export interface ConnectProviderCardProps {
  description: string;
  isConnected: boolean;
  isPending?: boolean;
  logo: ReactNode;
  name: string;
  onDisconnect?: () => void;
  provider: IntegrationProvider;
  returnTo?: string;
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
  onDisconnect,
  provider,
  returnTo = "/integrations",
}: ConnectProviderCardProps) {
  return (
    <Item
      className={cn(
        "items-center",
        isConnected && "border-emerald-500/35 bg-emerald-500/[0.03]"
      )}
      size="sm"
      variant="outline"
    >
      <ItemMedia
        className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-background text-foreground shadow-none [&_svg]:size-5"
        variant="default"
      >
        {logo}
      </ItemMedia>

      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="gap-2">
          <span>{name}</span>
          {isConnected ? connectedLabel : null}
        </ItemTitle>
        <ItemDescription className="line-clamp-2 text-xs sm:text-sm">
          {description}
        </ItemDescription>
      </ItemContent>

      <ItemActions className="ms-auto shrink-0">
        <ProviderActions
          isConnected={isConnected}
          isPending={isPending}
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
  onDisconnect,
  provider,
  returnTo,
}: {
  isConnected: boolean;
  isPending?: boolean;
  onDisconnect?: () => void;
  provider: IntegrationProvider;
  returnTo: string;
}) {
  if (isConnected) {
    if (!onDisconnect) {
      return null;
    }

    return (
      <Button onClick={onDisconnect} size="sm" type="button" variant="ghost">
        Desconectar
      </Button>
    );
  }

  return (
    <Button
      disabled={isPending}
      onClick={() => startOAuth(provider, returnTo)}
      size="sm"
      type="button"
      variant="outline"
    >
      {isPending ? <Spinner className="size-3.5" /> : null}
      Conectar
    </Button>
  );
}
