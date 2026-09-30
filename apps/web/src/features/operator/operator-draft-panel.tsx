import { Button } from "@personal-os/ui/components/button";
import { FileText, X } from "lucide-react";

import { useUiStore } from "@/stores/ui-store";

export function OperatorDraftPanel() {
  const draft = useUiStore((s) => s.operatorDraft);
  const clearOperatorDraft = useUiStore((s) => s.clearOperatorDraft);

  if (!draft) {
    return null;
  }

  return (
    <section
      aria-label="Rascunho inserido pelo operador"
      className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-sm">{draft.heading}</p>
            <p className="text-muted-foreground text-xs">
              Inserido pelo PersonalOS AI — edite ou limpe quando quiser.
            </p>
          </div>
        </div>
        <Button
          aria-label="Limpar rascunho"
          onClick={clearOperatorDraft}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {draft.paragraphs.map((paragraph) => (
          <p
            className="text-muted-foreground text-sm leading-relaxed"
            key={paragraph}
          >
            {paragraph}
          </p>
        ))}
        {draft.bullets && draft.bullets.length > 0 ? (
          <ul className="list-disc space-y-1 ps-5 text-muted-foreground text-sm">
            {draft.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
