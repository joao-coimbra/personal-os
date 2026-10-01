import { cn } from "@personal-os/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { PersonalOsLogo } from "@/components/personal-os-logo";

export function AuthLogo({ className }: { className?: string }) {
  return (
    <Link className={cn("inline-flex items-center", className)} to="/login">
      <PersonalOsLogo withWordmark />
    </Link>
  );
}
