import { Item, ItemMedia } from "@personal-os/ui/components/item";
import { cn } from "@personal-os/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function AuthLogo({ className }: { className?: string }) {
  return (
    <Link
      className={cn("inline-flex items-center gap-2", className)}
      to="/login"
    >
      <Item
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center bg-primary p-1.5 text-primary-foreground"
      >
        <ItemMedia className="size-auto" variant="icon">
          <Sparkles className="size-[0.95rem]" />
        </ItemMedia>
      </Item>
      <span className="font-medium text-[0.9375rem]">PersonalOS</span>
    </Link>
  );
}
