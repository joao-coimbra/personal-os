import type { IncomingHttpHeaders } from "node:http";

import type { Context as ApiContext } from "@personal-os/api/context";
import { fromNodeHeaders } from "better-auth/node";
import { auth, db } from "./services";

export async function createContext(
  req: IncomingHttpHeaders
): Promise<ApiContext> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req),
  });
  return {
    db,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
