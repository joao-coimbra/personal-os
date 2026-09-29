import type { Session } from "@personal-os/auth";
import type { Database } from "@personal-os/db";

export type Context = {
  session: Session | null;
  db: Database;
};
