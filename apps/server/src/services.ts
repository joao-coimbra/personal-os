import { createAuth } from "@personal-os/auth";
import { createDb } from "@personal-os/db";

import { ENV, desktopOrigins } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db, desktopOrigins);
