import { Badge } from "@personal-os/ui/components/badge";
import { cn } from "@personal-os/ui/lib/utils";

export interface MatrixTask {
  id: string;
  name: string;
  quadrant?: string | null;
  reason?: string | null;
}

const QUADRANTS = [
  {
    axis: "Urgente · Importante",
    className: "border-red-500/25 bg-red-500/[0.06] dark:bg-red-500/[0.09]",
    empty: "Nada urgente e importante agora.",
    id: "do",
    title: "Fazer",
  },
  {
    axis: "Importante",
    className:
      "border-emerald-500/25 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.09]",
    empty: "Sem itens para agendar.",
    id: "schedule",
    title: "Agendar",
  },
  {
    axis: "Urgente",
    className:
      "border-amber-500/25 bg-amber-500/[0.06] dark:bg-amber-500/[0.09]",
    empty: "Nada para delegar.",
    id: "delegate",
    title: "Delegar",
  },
  {
    axis: "Baixa prioridade",
    className:
      "border-slate-500/20 bg-slate-500/[0.05] dark:bg-slate-500/[0.08]",
    empty: "Sem itens para eliminar.",
    id: "eliminate",
    title: "Eliminar",
  },
] as const;

function groupByQuadrant(tasks: MatrixTask[]) {
  const map = new Map<string, MatrixTask[]>();
  for (const task of tasks) {
    const key = task.quadrant ?? "eliminate";
    const list = map.get(key) ?? [];
    list.push(task);
    map.set(key, list);
  }
  return map;
}

export function EisenhowerMatrix({
  tasks,
  className,
}: {
  tasks: MatrixTask[];
  className?: string;
}) {
  const byQuadrant = groupByQuadrant(tasks);

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold text-lg tracking-tight">
            Matriz Eisenhower
          </h2>
          <p className="text-muted-foreground text-sm">
            Classificação automática conforme as tarefas entram no sistema.
          </p>
        </div>
        <div className="hidden items-center gap-3 text-muted-foreground text-xs sm:flex">
          <span className="rounded-full border px-2 py-0.5">← Urgente</span>
          <span className="rounded-full border px-2 py-0.5">Importante ↑</span>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[1.25rem_minmax(0,1fr)]">
        <div aria-hidden="true" className="relative hidden md:block">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em]">
            Importante
          </span>
        </div>
        <div className="min-w-0 space-y-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {QUADRANTS.map((quadrant) => {
              const items = byQuadrant.get(quadrant.id) ?? [];
              return (
                <div
                  className={cn(
                    "flex min-h-40 flex-col rounded-2xl border p-4",
                    quadrant.className
                  )}
                  key={quadrant.id}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{quadrant.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {quadrant.axis}
                      </p>
                    </div>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      {quadrant.empty}
                    </p>
                  ) : (
                    <ul className="flex flex-1 flex-col gap-1.5">
                      {items.slice(0, 6).map((task) => (
                        <li
                          className="rounded-lg border border-background/60 bg-background/70 px-2.5 py-1.5 text-sm backdrop-blur-sm"
                          key={task.id}
                          title={task.reason ?? undefined}
                        >
                          <span className="line-clamp-2">{task.name}</span>
                        </li>
                      ))}
                      {items.length > 6 ? (
                        <li className="text-muted-foreground text-xs">
                          +{items.length - 6} outras
                        </li>
                      ) : null}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <p
            aria-hidden="true"
            className="hidden text-center text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] md:block"
          >
            Urgente →
          </p>
        </div>
      </div>
    </section>
  );
}
