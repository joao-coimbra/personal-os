import { createAnthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { Database } from "@personal-os/db";
import { integrationConnection } from "@personal-os/db/schema/app";
import { getIntegrationToken } from "@personal-os/integrations";
import { and, eq, inArray } from "drizzle-orm";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_MODEL = "gpt-5.4";

export type AiModelProvider = "anthropic" | "openai";

type OperatorLanguageModel =
  | ReturnType<ReturnType<typeof createAnthropic>>
  | ReturnType<ReturnType<typeof createOpenAI>>
  | ReturnType<typeof google>;

export interface ResolvedOperatorModel {
  label: string;
  model: OperatorLanguageModel;
  provider: AiModelProvider | "google";
}

async function markProviderError(
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
  const apiKey = await getIntegrationToken(db, userId, provider, encryptionKey);
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

export async function resolveOperatorModel(input: {
  db: Database;
  encryptionKey: string;
  preferredAiProvider?: string | null;
  userId: string;
}): Promise<ResolvedOperatorModel> {
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
  const order = buildProviderOrder(input.preferredAiProvider, connected);

  const resolvedList = await Promise.all(
    order.map((provider) =>
      resolveFromProvider(input.db, input.userId, input.encryptionKey, provider)
    )
  );

  for (const resolved of resolvedList) {
    if (resolved) {
      return resolved;
    }
  }

  return {
    label: "Gemini (gemini-2.5-flash)",
    model: google("gemini-2.5-flash"),
    provider: "google",
  };
}
