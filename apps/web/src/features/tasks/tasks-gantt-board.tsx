"use client";

import { RunBoard } from "@personal-os/ui/components/blocks/gantt-3/components/run-board";
import { Badge } from "@personal-os/ui/components/reui/badge";

/**
 * Agent-playbook Gantt adapted to PersonalOS operator workflows
 * (triagem do dia, bloco de foco, comunicação, revisão noturna).
 * Stage graph, retry lanes and critical path come from @reui/gantt-3.
 */
export function TasksGanttBoard() {
  return (
    <section className="flex w-full flex-col gap-4">
      <header className="flex flex-col gap-1 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-base">Playbook do operador</h2>
          <Badge variant="secondary">Demo estruturada</Badge>
          <Badge className="bg-background" variant="outline">
            Caminho crítico
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Dependências entre etapas, lanes de retry e caminho crítico para o
          fluxo diário do PersonalOS. Não sincroniza ainda com a API de tasks.
        </p>
      </header>
      <div className="min-h-[28rem] overflow-hidden rounded-lg border bg-background">
        <RunBoard />
      </div>
    </section>
  );
}
