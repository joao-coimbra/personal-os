import { AuthLogo } from "./auth-logo";

export function AuthHeader() {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-8 sm:py-6 lg:px-10">
      <AuthLogo />
      <p className="text-muted-foreground text-sm">
        Produtividade pessoal com IA
      </p>
    </header>
  );
}
