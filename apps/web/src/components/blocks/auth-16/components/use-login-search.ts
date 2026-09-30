import { useSearch } from "@tanstack/react-router";

/** Optional `?error=` from Better Auth OAuth redirects to `/login`. */
export function useLoginSearch(): { error?: string } {
  const search = useSearch({ from: "/login", strict: false });
  const error =
    typeof search === "object" &&
    search !== null &&
    "error" in search &&
    typeof search.error === "string"
      ? search.error
      : undefined;
  return { error };
}
