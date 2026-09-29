import { AUTH16_TRUST_BRANDS } from "./data";

export function AuthFooter() {
  return (
    <footer className="flex flex-col items-center gap-6 px-6 py-10 sm:px-8 sm:py-12">
      <p className="text-muted-foreground text-xs sm:text-sm">
        Feito para quem organiza tarefas, agenda e foco com IA
      </p>
      <div
        aria-label="Marcas de referência"
        className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-70 sm:gap-x-10"
        role="list"
      >
        {AUTH16_TRUST_BRANDS.map((brand) => (
          <div aria-label={brand.name} key={brand.id} role="listitem">
            {brand.logo}
          </div>
        ))}
      </div>
    </footer>
  );
}
