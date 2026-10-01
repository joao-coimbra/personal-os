import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getApiUrl } from "./server-url";

export const authClient = createAuthClient({
  baseURL: getApiUrl("/api/auth"),
  plugins: [magicLinkClient()],
});
