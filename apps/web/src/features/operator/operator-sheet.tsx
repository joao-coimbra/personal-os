import { Button } from "@personal-os/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@personal-os/ui/components/sheet";
import { Sparkles } from "lucide-react";

import { useUiStore } from "@/stores/ui-store";

import { OperatorChat } from "./operator-chat";

export function OperatorSheet() {
  const operatorOpen = useUiStore((s) => s.operatorOpen);
  const setOperatorOpen = useUiStore((s) => s.setOperatorOpen);

  return (
    <Sheet onOpenChange={setOperatorOpen} open={operatorOpen}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        side="right"
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            PersonalOS AI
          </SheetTitle>
          <SheetDescription className="text-left text-xs">
            Operador sobre Trello, Calendar e Notion conectados.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1">
          <OperatorChat />
        </div>
        <div className="border-t p-2">
          <Button
            className="w-full"
            onClick={() => setOperatorOpen(false)}
            type="button"
            variant="ghost"
          >
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
