import { AUTH16_CAPABILITIES } from "./data";

export function AuthFooter() {
  return (
    <footer className="flex flex-col items-center gap-4 px-6 py-10 sm:px-8 sm:py-12">
      <p className="max-w-md text-center text-muted-foreground text-xs sm:text-sm">
        Conecta as ferramentas do seu dia a dia — a IA organiza tarefas, agenda
        e foco
      </p>
      <ul
        aria-label="Integrações do PersonalOS"
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-muted-foreground text-xs sm:text-sm"
      >
        {AUTH16_CAPABILITIES.map((capability) => (
          <li className="inline-flex items-center gap-1.5" key={capability.id}>
            {capability.icon}
            <span>{capability.name}</span>
          </li>
        ))}
      </ul>
    </footer>
  );
}
