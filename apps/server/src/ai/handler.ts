import { devToolsMiddleware } from "@ai-sdk/devtools";
import { google } from "@ai-sdk/google";
import {
  buildOperatorTools,
  OPERATOR_SYSTEM_PROMPT,
} from "@personal-os/capabilities";
import type { Database } from "@personal-os/db";
import { userPreference } from "@personal-os/db/schema/app";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
  wrapLanguageModel,
} from "ai";
import { eq } from "drizzle-orm";

export interface AiRequestBody {
  id?: string;
  messages: UIMessage[];
}

export interface AiHandlerConfig {
  db: Database;
  encryptionKey: string;
  trelloApiKey?: string;
  trelloApiSecret?: string;
  userId: string;
}

export async function createOperatorStream(
  config: AiHandlerConfig,
  body: AiRequestBody
) {
  const prefsRows = await config.db
    .select()
    .from(userPreference)
    .where(eq(userPreference.userId, config.userId))
    .limit(1);
  const prefs = prefsRows[0];

  const tools = buildOperatorTools({
    db: config.db,
    encryptionKey: config.encryptionKey,
    trelloApiKey: config.trelloApiKey,
    trelloApiSecret: config.trelloApiSecret,
    userId: config.userId,
  });

  const model = wrapLanguageModel({
    middleware: devToolsMiddleware(),
    model: google("gemini-2.5-flash"),
  });

  const system = `${OPERATOR_SYSTEM_PROMPT}

User preferences:
- timezone: ${prefs?.timezone ?? "America/Sao_Paulo"}
- work hours: ${prefs?.workStart ?? "09:00"} - ${prefs?.workEnd ?? "18:00"}
- focus block: ${prefs?.focusMinutes ?? 50} min, break: ${prefs?.breakMinutes ?? 15} min`;

  return streamText({
    messages: await convertToModelMessages(body.messages),
    model,
    stopWhen: stepCountIs(8),
    system,
    tools,
  });
}
