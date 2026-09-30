import { devToolsMiddleware } from "@ai-sdk/devtools";
import {
  buildOperatorTools,
  OPERATOR_SYSTEM_PROMPT,
} from "@personal-os/capabilities";
import type { Database } from "@personal-os/db";
import {
  integrationConnection,
  userPreference,
} from "@personal-os/db/schema/app";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
  wrapLanguageModel,
} from "ai";
import { and, eq } from "drizzle-orm";

import { type AiModelProvider, resolveOperatorModel } from "./resolve-model";

export interface AiRequestBody {
  id?: string;
  messages: UIMessage[];
}

export interface AiHandlerConfig {
  db: Database;
  encryptionKey: string;
  trelloApiKey?: string;
  userId: string;
}

const INVALID_API_KEY_PATTERN = /invalid.*api.?key|unauthorized|401|403/i;

async function markConnectionError(
  db: Database,
  userId: string,
  provider: AiModelProvider,
  errorCode: string
) {
  await db
    .update(integrationConnection)
    .set({
      errorCode,
      status: "error",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrationConnection.userId, userId),
        eq(integrationConnection.provider, provider)
      )
    );
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
  const [prefs] = prefsRows;

  const tools = buildOperatorTools({
    db: config.db,
    encryptionKey: config.encryptionKey,
    trelloApiKey: config.trelloApiKey,
    userId: config.userId,
  });

  const resolved = await resolveOperatorModel({
    db: config.db,
    encryptionKey: config.encryptionKey,
    preferredAiProvider: prefs?.preferredAiProvider,
    userId: config.userId,
  });

  const model = wrapLanguageModel({
    middleware: devToolsMiddleware(),
    model: resolved.model,
  });

  const system = `${OPERATOR_SYSTEM_PROMPT}

Active model: ${resolved.label}

User preferences:
- timezone: ${prefs?.timezone ?? "America/Sao_Paulo"}
- work hours: ${prefs?.workStart ?? "09:00"} - ${prefs?.workEnd ?? "18:00"}
- focus block: ${prefs?.focusMinutes ?? 50} min, break: ${prefs?.breakMinutes ?? 15} min`;

  try {
    return streamText({
      messages: await convertToModelMessages(body.messages),
      model,
      stopWhen: stepCountIs(8),
      system,
      tools,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (INVALID_API_KEY_PATTERN.test(message)) {
      if (resolved.provider !== "google") {
        await markConnectionError(
          config.db,
          config.userId,
          resolved.provider,
          "invalid_api_key"
        );
      }
      throw new Error(
        "API key do modelo inválida ou expirada. Reconecte em Integrações.",
        { cause: error }
      );
    }
    throw error;
  }
}
