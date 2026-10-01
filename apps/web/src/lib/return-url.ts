/**
 * Merge query params onto a relative app path that may already include a search string.
 * Avoids `/onboarding?step=x?connected=y` when returnTo already has `?`.
 */
export function withSearchParams(
  path: string,
  params: Record<string, string>
): string {
  const url = new URL(path, "http://local.invalid");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
