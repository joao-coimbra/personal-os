import { createAuth } from "@personal-os/auth";
import { createDb } from "@personal-os/db";

import { desktopOrigins, ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db, desktopOrigins);
