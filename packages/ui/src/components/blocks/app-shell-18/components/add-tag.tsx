import { Button } from "@personal-os/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@personal-os/ui/components/dialog";
import { Field, FieldLabel } from "@personal-os/ui/components/field";
import { Input } from "@personal-os/ui/components/input";
import { cn } from "@personal-os/ui/lib/utils";
import { useState } from "react";

import { TAG_DOT, TAG_SWATCHES, type TagColor } from "./data";

interface AddTagDialogProps {
  onCreate: (data: { label: string; color: TagColor }) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function AddTagDialog({
  open,
  onOpenChange,
  onCreate,
}: AddTagDialogProps) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<TagColor>("rose");

  const submit = () => {
    if (!label.trim()) {
      return;
    }
    onCreate({ color, label: label.trim() });
    setLabel("");
    setColor("rose");
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Tag</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="new-tag-label">Tag name</FieldLabel>
          <Input
            autoFocus
            id="new-tag-label"
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && label.trim()) {
                submit();
              }
            }}
            placeholder="Enter a tag name"
            value={label}
          />
        </Field>

        <Field>
          <FieldLabel>Color</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            {TAG_SWATCHES.map((swatch) => (
              <button
                aria-label={swatch}
                aria-pressed={color === swatch}
                className={cn(
                  "size-6 shrink-0 rounded-full ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  TAG_DOT[swatch],
                  color === swatch && "ring-2 ring-ring ring-offset-2"
                )}
                key={swatch}
                onClick={() => setColor(swatch)}
                type="button"
              />
            ))}
          </div>
        </Field>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!label.trim()} onClick={submit}>
            Add Tag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
