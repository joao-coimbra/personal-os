import { Button } from "@personal-os/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@personal-os/ui/components/card";
import { Input } from "@personal-os/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  desktopRuntimeAvailable,
  loadStoredWorkspaces,
  pickWorkspaceDirectory,
} from "@/lib/desktop-workspace";
import { getApiUrl } from "@/lib/server-url";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_app/files")({
  component: FilesPage,
});

function FilesPage() {
  const [label, setLabel] = useState("Faculdade");
  const [pdfText, setPdfText] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const workspaces = useQuery(orpc.files.listWorkspaces.queryOptions());
  const localWorkspaces = loadStoredWorkspaces();
  const isDesktop = desktopRuntimeAvailable();

  const register = useMutation({
    mutationFn: () =>
      client.files.registerWorkspace({
        label,
        pathFingerprint: crypto.randomUUID(),
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const handlePdfUpload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(getApiUrl("/api/files/extract-pdf"), {
      body: form,
      credentials: "include",
      method: "POST",
    });
    if (!res.ok) {
      setPdfText(`Erro: ${res.status}`);
      return;
    }
    const data = (await res.json()) as { text: string };
    setPdfText(data.text.slice(0, 4000));
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-semibold text-2xl">Authorized Workspace</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspaces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input onChange={(e) => setLabel(e.target.value)} value={label} />
            <Button
              disabled={register.isPending}
              onClick={() => register.mutate()}
              type="button"
            >
              Register
            </Button>
          </div>
          {isDesktop && (
            <Button
              onClick={() => {
                void pickWorkspaceDirectory().then((ws) => {
                  if (ws) {
                    void register.mutateAsync();
                  }
                });
              }}
              type="button"
              variant="outline"
            >
              Escolher pasta (desktop)
            </Button>
          )}
          <ul className="text-sm">
            {workspaces.data?.map((w) => (
              <li key={w.id}>{w.label}</li>
            ))}
            {localWorkspaces.map((w) => (
              <li key={w.id}>
                {w.label} <span className="text-muted-foreground">(local)</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">
            No desktop (Tauri), selecione pastas locais com permissão explícita.
            No browser, use upload de PDF abaixo (golden path acadêmico).
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDF do trabalho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handlePdfUpload(file);
              }
            }}
            type="file"
          />
          {pdfText && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
              {pdfText}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
