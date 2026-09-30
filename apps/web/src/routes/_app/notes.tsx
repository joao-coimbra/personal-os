import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/notes")({
  component: NotesPage,
});

function NotesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 font-semibold text-2xl">Notes</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notion Knowledge</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Conecte o Notion em Integrations e use o AI Operator para pesquisar ou
          criar notas.
        </CardContent>
      </Card>
    </div>
  );
}
