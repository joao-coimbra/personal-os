// @ts-nocheck
import { Skeleton } from "@personal-os/ui/components/skeleton";
import { cn } from "cn";
import type { RefObject } from "react";

import { DOC_SECTIONS, DRAFT_SECTION_ID, type DraftPayload } from "./data";

/** Line widths per section, ragged the way prose is. No copy, only shape. */
const SECTION_LINES: Record<string, string[]> = {
  fixes: ["w-11/12", "w-full", "w-3/4", "w-5/12"],
  highlights: ["w-full", "w-11/12", "w-2/3"],
  scim: ["w-full", "w-10/12", "w-full", "w-1/2"],
};

/** Fallback shape for a section the map does not name. */
const DEFAULT_LINES = ["w-full", "w-10/12", "w-2/3"];

// customize: swap this whole document for your own page. Only the section
// named by DRAFT_SECTION_ID is real, because that is the one Insert writes to.
function SectionSkeleton({ id }: { id: string }) {
  const lines = SECTION_LINES[id] ?? DEFAULT_LINES;

  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5 px-3 py-2">
      <Skeleton className="h-4 w-40 animate-none" />
      {lines.map((width, index) => (
        <Skeleton className={`h-3 animate-none ${width}`} key={index} />
      ))}
    </div>
  );
}

export function ReleaseDoc({
  draft,
  flash,
  draftRef,
}: {
  /** The accepted draft for the empty section, or null while it is unwritten. */
  draft: DraftPayload | null;
  /** Tints the filled section for one beat so the change is impossible to miss. */
  flash: boolean;
  draftRef: RefObject<HTMLElement | null>;
}) {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      {/* The page around the gap is shape only, so the one section the
          assistant is filling is the only real text on it. */}
      <header aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-5 w-28 animate-none" />
        <Skeleton className="h-7 w-72 max-w-full animate-none" />
        <Skeleton className="h-3 w-56 max-w-full animate-none" />
      </header>

      <div className="mt-8 flex flex-col gap-8">
        {DOC_SECTIONS.map((section) => {
          const isDraftTarget = section.id === DRAFT_SECTION_ID;

          if (!isDraftTarget) {
            return <SectionSkeleton id={section.id} key={section.id} />;
          }

          const paragraphs = draft ? draft.paragraphs : section.body;
          const bullets = draft ? draft.bullets : section.bullets;

          return (
            <section
              aria-labelledby={`${section.id}-heading`}
              className={cn(
                "-mx-3 flex scroll-mt-6 flex-col gap-2.5 px-3 py-2 transition-colors duration-300 motion-reduce:transition-none",
                flash ? "bg-primary/6" : "bg-transparent"
              )}
              key={section.id}
              ref={draftRef}
            >
              <h2
                className="font-semibold text-base tracking-tight"
                id={`${section.id}-heading`}
              >
                {section.heading}
              </h2>

              {paragraphs.map((paragraph, index) => (
                <p className="text-muted-foreground text-sm/6" key={index}>
                  {paragraph}
                </p>
              ))}

              {bullets ? (
                <ul className="flex list-disc flex-col gap-1.5 ps-5 text-muted-foreground text-sm/6">
                  {bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}

              {/* An unwritten section keeps its slot in the outline so the
                  document still reads as finished apart from this one gap. */}
              {section.placeholder && paragraphs.length === 0 ? (
                <p className="text-muted-foreground text-sm/6 italic">
                  {section.placeholder}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </article>
  );
}
