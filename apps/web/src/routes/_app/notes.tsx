import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { Skeleton } from "@personal-os/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLinkIcon } from "lucide-react";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/notes")({
  component: NotesPage,
});

function NotesPage() {
  const notes = useQuery(orpc.notes.list.queryOptions({ input: {} }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-semibold text-2xl">Notes</h1>
        <p className="text-muted-foreground text-sm">
          Páginas do Notion conectado (busca via integração).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notion Knowledge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notes.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-5/6" />
              <Skeleton className="h-8 w-4/6" />
            </div>
          ) : null}
          {notes.error ? (
            <p className="text-destructive text-sm">
              {(notes.error as Error).message}
            </p>
          ) : null}
          {!(notes.isLoading || notes.error) &&
          (notes.data?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma página encontrada. Conecte o Notion e rode{" "}
              <code className="rounded bg-muted px-1">bun run seed</code> para
              criar notas de exemplo.
            </p>
          ) : null}
          {notes.data?.map((note) => (
            <div
              className="flex items-center justify-between gap-3 border-b pb-2 last:border-0"
              key={note.id}
            >
              <p className="font-medium text-sm">{note.title}</p>
              {note.url ? (
                <a
                  className="inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
                  href={note.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Abrir
                  <ExternalLinkIcon aria-hidden="true" className="size-3" />
                </a>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
