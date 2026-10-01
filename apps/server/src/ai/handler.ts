import { devToolsMiddleware } from "@ai-sdk/devtools";
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

import {
  type AiModelProvider,
  markProviderError,
  type ResolvedOperatorModel,
  resolveOperatorModelCandidates,
} from "./resolve-model";

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

const FAILOVER_ERROR_PATTERN =
  /invalid.*api.?key|unauthorized|401|403|insufficient.?quota|credit.?balance|billing|quota|429|no credits|model .+ is no longer available|not found for API version|NOT_FOUND|permission.?denied|high demand|UNAVAILABLE|No output generated|RESOURCE_EXHAUSTED/i;

const QUOTA_ERROR_PATTERN =
  /insufficient.?quota|credit.?balance|no credits|billing|exceeded your current quota|rate.?limit|429/i;

const INVALID_KEY_PATTERN = /invalid.*api.?key|unauthorized|401|403/i;

const MODEL_UNAVAILABLE_PATTERN =
  /no longer available|NOT_FOUND|not found for API/i;

const HIGH_DEMAND_PATTERN = /high demand|UNAVAILABLE|503/i;

/**
 * Only commit (disable failover) once the model emits user-visible text /
 * reasoning or the overall stream finishes. Tool-call / tool-result /
 * finish-step must NOT commit — Gemini often 503/429 on the *next* step after
 * tools, and we still need to failover before the HTTP response starts.
 */
const COMMIT_PART_TYPES = new Set([
  "text-start",
  "text-delta",
  "reasoning-start",
  "reasoning-delta",
  "finish",
]);

interface ProviderErrorShape {
  responseBody?: string;
  statusCode?: number;
}

interface UserPrefs {
  breakMinutes?: number | null;
  focusMinutes?: number | null;
  timezone?: string | null;
  workEnd?: string | null;
  workStart?: string | null;
}

export function isProviderFailoverError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (FAILOVER_ERROR_PATTERN.test(message)) {
    return true;
  }
  if (!(error && typeof error === "object")) {
    return false;
  }
  const { responseBody, statusCode } = error as ProviderErrorShape;
  if (
    statusCode === 401 ||
    statusCode === 404 ||
    statusCode === 429 ||
    statusCode === 503
  ) {
    return true;
  }
  // 403 only for provider auth — Calendar tool 403s must not trigger failover.
  if (statusCode === 403 && INVALID_KEY_PATTERN.test(message)) {
    return true;
  }
  return typeof responseBody === "string"
    ? FAILOVER_ERROR_PATTERN.test(responseBody)
    : false;
}

export function formatOperatorError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (HIGH_DEMAND_PATTERN.test(message) && !QUOTA_ERROR_PATTERN.test(message)) {
    return "Modelo temporariamente indisponível (alta demanda). Tente de novo em instantes.";
  }
  if (QUOTA_ERROR_PATTERN.test(message)) {
    return "Créditos/cota do modelo esgotados. Reconecte outra key em Integrações ou aguarde o Gemini do ambiente.";
  }
  if (INVALID_KEY_PATTERN.test(message)) {
    return "API key do modelo inválida ou expirada. Reconecte em Integrações.";
  }
  if (MODEL_UNAVAILABLE_PATTERN.test(message)) {
    return "Modelo de IA indisponível no momento. Tente de novo ou reconecte em Integrações.";
  }
  return message || "Falha ao gerar resposta do operador.";
}

function errorCodeFor(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (QUOTA_ERROR_PATTERN.test(message)) {
    return "quota_exhausted";
  }
  if (INVALID_KEY_PATTERN.test(message)) {
    return "invalid_api_key";
  }
  if (HIGH_DEMAND_PATTERN.test(message)) {
    return "high_demand";
  }
  return "provider_error";
}

interface ProviderStreamResult {
  fullStream: AsyncIterable<unknown>;
}

interface StreamPart {
  error?: unknown;
  type?: string;
}

type StreamIterator = AsyncIterator<unknown>;

function toError(value: unknown, fallback: string): Error {
  return value instanceof Error ? value : new Error(String(value ?? fallback));
}

function buildSystemPrompt(
  resolved: ResolvedOperatorModel,
  prefs: UserPrefs | undefined
): string {
  return `${OPERATOR_SYSTEM_PROMPT}

Active model: ${resolved.label}

User preferences:
- timezone: ${prefs?.timezone ?? "America/Sao_Paulo"}
- work hours: ${prefs?.workStart ?? "09:00"} - ${prefs?.workEnd ?? "18:00"}
- focus block: ${prefs?.focusMinutes ?? 50} min, break: ${prefs?.breakMinutes ?? 15} min`;
}

function enqueueStreamError(
  controller: ReadableStreamDefaultController,
  error: unknown
): void {
  try {
    controller.enqueue({
      error: formatOperatorError(error),
      type: "error",
    });
    controller.close();
  } catch {
    controller.error(toError(error, "provider stream error"));
  }
}

async function collectProbeBuffer(
  iterator: StreamIterator,
  buffer: StreamPart[] = []
): Promise<StreamPart[]> {
  const next = await iterator.next();
  if (next.done) {
    return buffer;
  }
  const part = next.value as StreamPart;
  buffer.push(part);
  if (part.type === "error") {
    throw toError(part.error, "provider stream error");
  }
  if (part.type && COMMIT_PART_TYPES.has(part.type)) {
    return buffer;
  }
  return collectProbeBuffer(iterator, buffer);
}

async function pumpRemaining(
  iterator: StreamIterator,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const next = await iterator.next();
  if (next.done) {
    controller.close();
    return;
  }
  const part = next.value as StreamPart;
  if (part.type === "error") {
    // Never controller.error() here — that aborts HTTP after headers and the
    // client surfaces a raw "network error" / connection-failure card.
    enqueueStreamError(controller, part.error);
    return;
  }
  controller.enqueue(part);
  await pumpRemaining(iterator, controller);
}

/**
 * Start streamText and wait until the provider emits user-visible output
 * (or fails). Tool rounds are buffered so mid-tool-loop 503/429 can still
 * failover before the HTTP response starts.
 */
async function openProviderStream(
  result: ProviderStreamResult
): Promise<ReadableStream> {
  const iterator = result.fullStream[Symbol.asyncIterator]();
  const buffer = await collectProbeBuffer(iterator);

  return new ReadableStream({
    cancel() {
      const closing = iterator.return?.();
      if (closing) {
        closing.catch(() => undefined);
      }
    },
    async start(controller) {
      try {
        for (const part of buffer) {
          controller.enqueue(part);
        }
        await pumpRemaining(iterator, controller);
      } catch (error) {
        enqueueStreamError(controller, error);
      }
    },
  });
}

async function tryProviderCandidate(input: {
  messages: Awaited<ReturnType<typeof convertToModelMessages>>;
  prefs: UserPrefs | undefined;
  resolved: ResolvedOperatorModel;
  tools: ReturnType<typeof buildOperatorTools>;
}): Promise<{
  label: string;
  provider: ResolvedOperatorModel["provider"];
  stream: ReadableStream;
}> {
  const model = wrapLanguageModel({
    middleware: devToolsMiddleware(),
    model: input.resolved.model,
  });

  const result = streamText({
    // Retry transient Gemini 503/high-demand before failing the candidate.
    maxRetries: 2,
    messages: input.messages,
    model,
    stopWhen: stepCountIs(8),
    system: buildSystemPrompt(input.resolved, input.prefs),
    tools: input.tools,
  });

  const stream = await openProviderStream(result);
  return {
    label: input.resolved.label,
    provider: input.resolved.provider,
    stream,
  };
}

async function runCandidates(input: {
  candidates: ResolvedOperatorModel[];
  config: AiHandlerConfig;
  index: number;
  lastError: unknown;
  messages: Awaited<ReturnType<typeof convertToModelMessages>>;
  prefs: UserPrefs | undefined;
  tools: ReturnType<typeof buildOperatorTools>;
}): Promise<{
  label: string;
  provider: ResolvedOperatorModel["provider"];
  stream: ReadableStream;
}> {
  const resolved = input.candidates[input.index];
  if (!resolved) {
    throw new Error(formatOperatorError(input.lastError), {
      cause: input.lastError,
    });
  }

  try {
    return await tryProviderCandidate({
      messages: input.messages,
      prefs: input.prefs,
      resolved,
      tools: input.tools,
    });
  } catch (error) {
    const hasMore = input.index < input.candidates.length - 1;
    const canFailover = isProviderFailoverError(error) && hasMore;

    if (resolved.provider !== "google" && isProviderFailoverError(error)) {
      await markProviderError(
        input.config.db,
        input.config.userId,
        resolved.provider as AiModelProvider,
        errorCodeFor(error)
      );
    }

    if (!canFailover) {
      throw new Error(formatOperatorError(error), { cause: error });
    }

    return runCandidates({
      ...input,
      index: input.index + 1,
      lastError: error,
    });
  }
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

  const candidates = await resolveOperatorModelCandidates({
    db: config.db,
    encryptionKey: config.encryptionKey,
    preferredAiProvider: prefs?.preferredAiProvider,
    userId: config.userId,
  });

  const messages = await convertToModelMessages(body.messages);

  return runCandidates({
    candidates,
    config,
    index: 0,
    lastError: undefined,
    messages,
    prefs,
    tools,
  });
}
