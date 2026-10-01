import { createAnthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { Database } from "@personal-os/db";
import { integrationConnection } from "@personal-os/db/schema/app";
import { getIntegrationToken } from "@personal-os/integrations";
import { and, eq, inArray } from "drizzle-orm";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_MODEL = "gpt-5.4";
/**
 * Gemini Flash fallbacks for the env GOOGLE_GENERATIVE_AI_API_KEY.
 * Prefer free-tier-friendly lite aliases first — gemini-flash-latest /
 * gemini-3-flash-preview / gemini-3.8-flash often share a tight free quota
 * and return 429 while lite still succeeds.
 */
const GOOGLE_MODEL = "gemini-flash-lite-latest";
const GOOGLE_MODEL_FALLBACKS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
] as const;

export type AiModelProvider = "anthropic" | "openai";

export type OperatorProvider = AiModelProvider | "google";

type OperatorLanguageModel =
  | ReturnType<ReturnType<typeof createAnthropic>>
  | ReturnType<ReturnType<typeof createOpenAI>>
  | ReturnType<typeof google>;

export interface ResolvedOperatorModel {
  label: string;
  model: OperatorLanguageModel;
  provider: OperatorProvider;
}

export async function markProviderError(
  db: Database,
  userId: string,
  provider: AiModelProvider,
  errorCode: string
): Promise<void> {
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

async function resolveFromProvider(
  db: Database,
  userId: string,
  encryptionKey: string,
  provider: AiModelProvider
): Promise<ResolvedOperatorModel | null> {
  let apiKey: string | null;
  try {
    apiKey = await getIntegrationToken(db, userId, provider, encryptionKey);
  } catch {
    await markProviderError(db, userId, provider, "decrypt_failed");
    return null;
  }
  if (!apiKey) {
    return null;
  }

  try {
    if (provider === "anthropic") {
      const anthropic = createAnthropic({ apiKey });
      return {
        label: `Claude (${ANTHROPIC_MODEL})`,
        model: anthropic(ANTHROPIC_MODEL),
        provider,
      };
    }

    const openai = createOpenAI({ apiKey });
    return {
      label: `ChatGPT (${OPENAI_MODEL})`,
      model: openai(OPENAI_MODEL),
      provider,
    };
  } catch {
    await markProviderError(db, userId, provider, "model_init_failed");
    return null;
  }
}

function buildProviderOrder(
  preferred: string | null | undefined,
  connected: Set<AiModelProvider>
): AiModelProvider[] {
  const order: AiModelProvider[] = [];
  if (
    (preferred === "anthropic" || preferred === "openai") &&
    connected.has(preferred)
  ) {
    order.push(preferred);
  }
  for (const provider of ["anthropic", "openai"] as const) {
    if (connected.has(provider) && !order.includes(provider)) {
      order.push(provider);
    }
  }
  return order;
}

function googleFallback(modelId: string = GOOGLE_MODEL): ResolvedOperatorModel {
  return {
    label: `Gemini (${modelId})`,
    model: google(modelId),
    provider: "google",
  };
}

function isGooglePreferred(preferred: string | null | undefined): boolean {
  // UI "Gemini" clears preferred to null; also accept explicit "google".
  return !preferred || preferred === "google";
}

/**
 * Ordered candidates:
 * - Gemini selected / no preference → env Gemini first, then connected keys
 * - Preferred openai/anthropic → that key → other connected keys → Gemini env
 */
export async function resolveOperatorModelCandidates(input: {
  db: Database;
  encryptionKey: string;
  preferredAiProvider?: string | null;
  userId: string;
}): Promise<ResolvedOperatorModel[]> {
  const connectedRows = await input.db
    .select({ provider: integrationConnection.provider })
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.userId, input.userId),
        eq(integrationConnection.status, "connected"),
        inArray(integrationConnection.provider, ["anthropic", "openai"])
      )
    );

  const connected = new Set(
    connectedRows.map((row) => row.provider as AiModelProvider)
  );
  // When Gemini is selected, still resolve connected keys as last resort —
  // but never try them before env Gemini (they are often quota-exhausted).
  const order = buildProviderOrder(
    isGooglePreferred(input.preferredAiProvider)
      ? null
      : input.preferredAiProvider,
    connected
  );

  const resolvedList = await Promise.all(
    order.map((provider) =>
      resolveFromProvider(input.db, input.userId, input.encryptionKey, provider)
    )
  );

  const userKeyCandidates: ResolvedOperatorModel[] = [];
  for (const resolved of resolvedList) {
    if (resolved) {
      userKeyCandidates.push(resolved);
    }
  }

  const googleCandidates = GOOGLE_MODEL_FALLBACKS.map((modelId) =>
    googleFallback(modelId)
  );

  // Gemini UI selection must not burn exhausted OpenAI/Anthropic keys first.
  if (isGooglePreferred(input.preferredAiProvider)) {
    return [...googleCandidates, ...userKeyCandidates];
  }
  return [...userKeyCandidates, ...googleCandidates];
}

export async function resolveOperatorModel(input: {
  db: Database;
  encryptionKey: string;
  preferredAiProvider?: string | null;
  userId: string;
}): Promise<ResolvedOperatorModel> {
  const candidates = await resolveOperatorModelCandidates(input);
  return candidates[0] ?? googleFallback();
}
