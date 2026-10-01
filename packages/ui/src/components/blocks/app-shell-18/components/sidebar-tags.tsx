import { Button } from "@personal-os/ui/components/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@personal-os/ui/components/sidebar";
import { cn } from "@personal-os/ui/lib/utils";
import { Plus } from "lucide-react";
import { useState } from "react";

import { AddTagDialog } from "./add-tag";
import { TAG_DOT, TAGS, type Tag, type TagColor } from "./data";

export function SidebarTags() {
  const [tags, setTags] = useState<Tag[]>(TAGS);
  const [open, setOpen] = useState(false);

  const createTag = ({ label, color }: { label: string; color: TagColor }) => {
    setTags((prev) => [
      ...prev,
      { color, id: `tag-${prev.length + 1}-${label}`, label },
    ]);
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Tags</SidebarGroupLabel>
      <SidebarGroupContent className="overflow-hidden">
        <div className="flex w-[calc(var(--sidebar-width)-2rem)] shrink-0 flex-wrap gap-1.5 px-2 pt-1">
          {tags.map((tag) => (
            <Button
              className="gap-1.5 font-normal"
              key={tag.id}
              size="sm"
              type="button"
              variant="outline"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  TAG_DOT[tag.color]
                )}
              />
              {tag.label}
            </Button>
          ))}

          <Button
            className="gap-1.5 font-normal"
            onClick={() => setOpen(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" />
            Add Tag
          </Button>
        </div>
      </SidebarGroupContent>

      <AddTagDialog onCreate={createTag} onOpenChange={setOpen} open={open} />
    </SidebarGroup>
  );
}
