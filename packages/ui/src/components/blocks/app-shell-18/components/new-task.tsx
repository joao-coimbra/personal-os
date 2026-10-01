import { Button } from "@personal-os/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@personal-os/ui/components/dialog";
import { Field, FieldLabel } from "@personal-os/ui/components/field";
import { Input } from "@personal-os/ui/components/input";
import { Plus } from "lucide-react";
import { useState } from "react";

export function NewTask() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const submit = () => {
    setOpen(false);
    setTitle("");
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button
            aria-label="New Task"
            className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          />
        }
      >
        <Plus aria-hidden="true" />
        <span className="group-data-[collapsible=icon]:hidden">New Task</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="new-task-title">Task name</FieldLabel>
          <Input
            autoFocus
            id="new-task-title"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && title.trim()) {
                submit();
              }
            }}
            placeholder="What needs to get done?"
            value={title}
          />
        </Field>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!title.trim()} onClick={submit}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
