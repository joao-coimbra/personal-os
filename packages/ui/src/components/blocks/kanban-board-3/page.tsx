import { KanbanBoard } from "./components/kanban-board";

export function Page() {
  return (
    <main
      aria-labelledby="page-heading"
      className="flex min-h-svh w-full items-start justify-center bg-background p-3"
    >
      <h1 className="sr-only" id="page-heading">
        Frameless sales pipeline kanban board
      </h1>
      <KanbanBoard />
    </main>
  );
}
