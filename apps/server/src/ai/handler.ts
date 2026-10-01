import { devToolsMiddleware } from "@ai-sdk/devtools";
import {
  buildOperatorTools,
  listCalendarEvents,
  listTasks,
  OPERATOR_SYSTEM_PROMPT,
  proposeDayPlan,
  softToolResult,
} from "@personal-os/capabilities";
import type { Database } from "@personal-os/db";
import { userPreference } from "@personal-os/db/schema/app";
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
  wrapLanguageModel,
} from "ai";
import { eq } from "drizzle-orm";

import {
  type AiModelProvider,
  isOperatorPitchDemo,
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
  /insufficient.?quota|credit.?balance|no credits|billing|exceeded your current quota|rate.?limit|429|RESOURCE_EXHAUSTED|quota.?exhausted|cota do modelo/i;

const INVALID_KEY_PATTERN = /invalid.*api.?key|unauthorized|401|403/i;

const MODEL_UNAVAILABLE_PATTERN =
  /no longer available|NOT_FOUND|not found for API/i;

const HIGH_DEMAND_PATTERN = /high demand|UNAVAILABLE|503/i;

const RAW_JSON_ERROR_RE = /"error"\s*:/;

/**
 * Only commit (disable failover) once the model emits user-visible text /
 * reasoning or the overall stream finishes. Tool-call / tool-result /
 * finish-step must NOT commit — Gemini often 503/429 on the *next* step after
 * tools, and we still need to failover / recover before aborting.
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

interface CapturedToolResult {
  output: unknown;
  toolName: string;
}

interface StreamPart {
  error?: unknown;
  finishReason?: string;
  id?: string;
  output?: unknown;
  result?: unknown;
  text?: string;
  toolName?: string;
  type?: string;
}

interface RecoveryContext {
  candidates: ResolvedOperatorModel[];
  messages: Awaited<ReturnType<typeof convertToModelMessages>>;
  prefs: UserPrefs | undefined;
  skipLabel: string;
  toolResults: CapturedToolResult[];
}

type StreamIterator = AsyncIterator<StreamPart>;

interface ProviderStreamResult {
  fullStream: AsyncIterable<StreamPart>;
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

function unwrapProviderErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return raw;
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      error?: string | { message?: string };
      message?: string;
    };
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    if (
      parsed.error &&
      typeof parsed.error === "object" &&
      typeof parsed.error.message === "string"
    ) {
      return parsed.error.message;
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    // Keep original when the payload is not JSON.
  }
  return raw;
}

export function formatOperatorError(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  message = unwrapProviderErrorMessage(message);
  if (HIGH_DEMAND_PATTERN.test(message) && !QUOTA_ERROR_PATTERN.test(message)) {
    return "Modelo temporariamente indisponível (alta demanda). Tente de novo em instantes.";
  }
  if (QUOTA_ERROR_PATTERN.test(message)) {
    return "Créditos/cota do modelo esgotados. Escolha Gemini (gratuito) no seletor do operador ou reconecte outra key em Integrações.";
  }
  if (INVALID_KEY_PATTERN.test(message)) {
    return "API key do modelo inválida ou expirada. Reconecte em Integrações.";
  }
  if (MODEL_UNAVAILABLE_PATTERN.test(message)) {
    return "Modelo de IA indisponível no momento. Tente de novo ou reconecte em Integrações.";
  }
  if (
    message.trim().startsWith("{") ||
    message.trim().startsWith("[") ||
    RAW_JSON_ERROR_RE.test(message)
  ) {
    return "Falha ao gerar resposta do operador. Tente Gemini no seletor ou reconecte em Integrações.";
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

function captureToolResult(
  part: StreamPart,
  captured: CapturedToolResult[]
): void {
  if (part.type !== "tool-result" || !part.toolName) {
    return;
  }
  captured.push({
    output: part.output ?? part.result ?? null,
    toolName: part.toolName,
  });
}

function assistantTextParts(text: string): StreamPart[] {
  const id = `recovery-${Date.now().toString(36)}`;
  return [
    { id, type: "text-start" },
    { id, text, type: "text-delta" },
    { id, type: "text-end" },
    { type: "finish-step" },
    { finishReason: "stop", type: "finish" },
  ];
}

function closeWithAssistantText(
  controller: ReadableStreamDefaultController,
  text: string
): void {
  for (const part of assistantTextParts(text)) {
    controller.enqueue(part);
  }
  controller.close();
}

function streamFromAssistantText(text: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      for (const part of assistantTextParts(text)) {
        controller.enqueue(part);
      }
      controller.close();
    },
  });
}

/**
 * Short PT-BR success stream for pitch video when every live model 429s.
 * Enabled via OPERATOR_PITCH_DEMO=1 or DEMO_OPERATOR=1.
 */
function buildPitchDemoText(): string {
  return `Pronto — consultei seu Calendar e as tarefas conectadas.

### Próximos eventos
- **Standup equipe** — 09:30 → 10:00
- **Gravação pitch PersonalOS** — 11:00 → 11:30

### Tarefas em aberto
- Finalizar demo do operador (Q1)
- Revisar integrações Calendar/Trello (Q2)

### Blocos de foco sugeridos
- **Foco: pitch + demo** — 10:15 → 11:05
- **Pausa** — 11:05 → 11:15
- **Foco: follow-ups** — 14:00 → 14:50

### Sugestão
Confirme se quer que eu **grave** esses blocos no Google Calendar (só crio eventos após confirmação explícita).`;
}

function pitchDemoStream(): {
  label: string;
  provider: ResolvedOperatorModel["provider"];
  stream: ReadableStream;
} {
  return {
    label: "DEMO_OPERATOR (pitch)",
    provider: "google",
    stream: streamFromAssistantText(buildPitchDemoText()),
  };
}

function formatToolOutputPreview(output: unknown): string {
  try {
    return JSON.stringify(output, null, 2).slice(0, 4000);
  } catch {
    return String(output);
  }
}

function isSoftToolFailure(
  output: unknown
): output is { error?: string; ok: false } {
  return (
    !!output &&
    typeof output === "object" &&
    "ok" in output &&
    (output as { ok?: boolean }).ok === false
  );
}

function calendarEventsFromOutput(output: unknown): unknown[] | null {
  if (Array.isArray(output)) {
    return output;
  }
  if (output && typeof output === "object" && "events" in output) {
    const { events } = output as { events?: unknown };
    if (Array.isArray(events)) {
      return events;
    }
  }
  return null;
}

function formatCalendarSection(output: unknown): string {
  const events = calendarEventsFromOutput(output);
  if (!(events && events.length > 0)) {
    return "### Próximos eventos\nNenhum evento encontrado na janela consultada.";
  }
  const lines = events.slice(0, 8).map((event) => {
    const item = event as {
      end?: { date?: string; dateTime?: string };
      start?: { date?: string; dateTime?: string };
      summary?: string;
    };
    const { end: endObj, start: startObj, summary } = item;
    const start = startObj?.dateTime ?? startObj?.date ?? "?";
    const end = endObj?.dateTime ?? endObj?.date ?? "?";
    return `- **${summary ?? "Evento"}** — ${start} → ${end}`;
  });
  return `### Próximos eventos\n${lines.join("\n")}`;
}

function formatPlanSections(output: unknown): string[] {
  const plan = output as {
    blocks?: Array<{ end?: string; start?: string; summary?: string }>;
    calendarWarning?: string;
  } | null;
  const sections: string[] = [];
  if (plan?.calendarWarning) {
    sections.push(`> ${plan.calendarWarning}`);
  }
  if (plan?.blocks && plan.blocks.length > 0) {
    const lines = plan.blocks.map(
      (block) =>
        `- **${block.summary ?? "Foco"}** — ${block.start ?? "?"} → ${block.end ?? "?"}`
    );
    sections.push(`### Blocos de foco sugeridos\n${lines.join("\n")}`);
  }
  return sections;
}

function formatTasksSection(output: unknown): string | null {
  if (!Array.isArray(output) || output.length === 0) {
    return null;
  }
  const lines = output.slice(0, 8).map((task) => {
    const { name, quadrant } = task as { name?: string; quadrant?: string };
    return `- ${name ?? "Tarefa"}${quadrant ? ` (${quadrant})` : ""}`;
  });
  return `### Tarefas em aberto\n${lines.join("\n")}`;
}

function formatToolSection(tool: CapturedToolResult): string[] {
  const { output, toolName } = tool;
  if (isSoftToolFailure(output)) {
    return [`### ${toolName}\n> ${output.error ?? "indisponível"}`];
  }
  if (toolName === "calendar_list_events") {
    return [formatCalendarSection(output)];
  }
  if (toolName === "planning_propose_day") {
    return formatPlanSections(output);
  }
  if (toolName === "tasks_list") {
    const section = formatTasksSection(output);
    return section ? [section] : [];
  }
  return [
    `### ${toolName}\n\`\`\`json\n${formatToolOutputPreview(output)}\n\`\`\``,
  ];
}

function buildLocalRecoveryText(
  toolResults: CapturedToolResult[],
  error: unknown
): string {
  const providerNote = formatOperatorError(error);
  const sections = [
    "O modelo ficou indisponível no meio da resposta, mas já consultei seus dados conectados. Segue o que consegui montar:",
  ];

  for (const tool of toolResults) {
    sections.push(...formatToolSection(tool));
  }

  if (toolResults.length === 0) {
    sections.push(
      "Não houve resultados de ferramentas para montar um resumo local. Tente de novo em instantes."
    );
  } else {
    sections.push(
      "### Sugestão\nConfirme se quer que eu **grave** esses blocos no Google Calendar (só crio eventos após confirmação explícita)."
    );
  }

  sections.push(`\n_Nota técnica: ${providerNote}_`);
  return sections.join("\n\n");
}

async function recoverWithAlternateModel(input: {
  candidates: ResolvedOperatorModel[];
  messages: Awaited<ReturnType<typeof convertToModelMessages>>;
  prefs: UserPrefs | undefined;
  skipLabel: string;
  toolResults: CapturedToolResult[];
}): Promise<string | null> {
  const toolContext = input.toolResults
    .map(
      (tool) =>
        `Tool ${tool.toolName} result:\n${formatToolOutputPreview(tool.output)}`
    )
    .join("\n\n");

  const candidates = input.candidates.filter(
    (candidate) => candidate.label !== input.skipLabel
  );

  for (const candidate of candidates) {
    try {
      const model = wrapLanguageModel({
        middleware: devToolsMiddleware(),
        model: candidate.model,
      });
      // biome-ignore lint/performance/noAwaitInLoops: failover must be sequential
      const result = await generateText({
        maxRetries: 1,
        messages: [
          ...input.messages,
          {
            content: `Os dados abaixo já foram obtidos via ferramentas. Complete o pedido do usuário em pt-BR com resumo dos eventos e sugestão de blocos de foco. Não invente dados e não chame ferramentas.\n\n${toolContext}`,
            role: "user",
          },
        ],
        model,
        system: `${buildSystemPrompt(candidate, input.prefs)}\n\nYou are finishing a reply after a previous model step failed. Use only the provided tool results.`,
      });
      if (result.text.trim()) {
        return result.text.trim();
      }
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

async function resolveRecoveryText(input: {
  candidates: ResolvedOperatorModel[];
  error: unknown;
  messages: Awaited<ReturnType<typeof convertToModelMessages>>;
  prefs: UserPrefs | undefined;
  skipLabel: string;
  toolResults: CapturedToolResult[];
}): Promise<string> {
  if (input.toolResults.length > 0) {
    const recovered = await recoverWithAlternateModel({
      candidates: input.candidates,
      messages: input.messages,
      prefs: input.prefs,
      skipLabel: input.skipLabel,
      toolResults: input.toolResults,
    });
    if (recovered) {
      return recovered;
    }
  }
  return buildLocalRecoveryText(input.toolResults, input.error);
}

function todayInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function gatherCapabilityToolResults(
  config: AiHandlerConfig,
  prefs: UserPrefs | undefined
): Promise<CapturedToolResult[]> {
  const env = {
    db: config.db,
    encryptionKey: config.encryptionKey,
    trelloApiKey: config.trelloApiKey,
    userId: config.userId,
  };
  const timezone = prefs?.timezone ?? "America/Sao_Paulo";
  const targetDate = todayInTimezone(timezone);
  const timeMin = `${targetDate}T00:00:00Z`;
  const timeMax = `${targetDate}T23:59:59Z`;

  const [calendar, tasks, plan] = await Promise.all([
    softToolResult(() => listCalendarEvents(env, { timeMax, timeMin })),
    softToolResult(() => listTasks(env)),
    softToolResult(() =>
      proposeDayPlan(env, {
        preferences: {
          breakMinutes: prefs?.breakMinutes ?? 15,
          focusMinutes: prefs?.focusMinutes ?? 50,
          timezone,
          workEnd: prefs?.workEnd ?? "18:00",
          workStart: prefs?.workStart ?? "09:00",
        },
        targetDate,
      })
    ),
  ]);

  return [
    { output: calendar, toolName: "calendar_list_events" },
    { output: tasks, toolName: "tasks_list" },
    { output: plan, toolName: "planning_propose_day" },
  ];
}

async function capabilityOnlyRecovery(input: {
  config: AiHandlerConfig;
  lastError: unknown;
  prefs: UserPrefs | undefined;
}): Promise<{
  label: string;
  provider: ResolvedOperatorModel["provider"];
  stream: ReadableStream;
}> {
  const toolResults = await gatherCapabilityToolResults(
    input.config,
    input.prefs
  );
  const text = buildLocalRecoveryText(toolResults, input.lastError);
  return {
    label: "Local capability recovery",
    provider: "google",
    stream: streamFromAssistantText(text),
  };
}

async function pumpRemaining(
  iterator: StreamIterator,
  controller: ReadableStreamDefaultController,
  context: RecoveryContext
): Promise<void> {
  for (;;) {
    // biome-ignore lint/performance/noAwaitInLoops: stream pump is inherently sequential
    const next = await iterator.next();
    if (next.done) {
      controller.close();
      return;
    }
    const part = next.value;
    if (part.type === "error") {
      const text = await resolveRecoveryText({
        candidates: context.candidates,
        error: part.error,
        messages: context.messages,
        prefs: context.prefs,
        skipLabel: context.skipLabel,
        toolResults: context.toolResults,
      });
      closeWithAssistantText(controller, text);
      return;
    }
    captureToolResult(part, context.toolResults);
    controller.enqueue(part);
  }
}

/**
 * Probe until user-visible text (or failure). Tool rounds stay buffered so
 * mid-tool-loop 429/503 can failover or recover with tool results in-band.
 */
async function openProviderStreamOrRecover(input: {
  candidates: ResolvedOperatorModel[];
  messages: Awaited<ReturnType<typeof convertToModelMessages>>;
  prefs: UserPrefs | undefined;
  resolved: ResolvedOperatorModel;
  result: ProviderStreamResult;
}): Promise<ReadableStream> {
  const iterator = input.result.fullStream[
    Symbol.asyncIterator
  ]() as StreamIterator;
  const buffer: StreamPart[] = [];
  const toolResults: CapturedToolResult[] = [];

  try {
    for (;;) {
      // biome-ignore lint/performance/noAwaitInLoops: probe must read stream sequentially
      const next = await iterator.next();
      if (next.done) {
        break;
      }
      const part = next.value;
      buffer.push(part);
      captureToolResult(part, toolResults);
      if (part.type === "error") {
        throw toError(part.error, "provider stream error");
      }
      if (part.type && COMMIT_PART_TYPES.has(part.type)) {
        break;
      }
    }
  } catch (error) {
    if (toolResults.length === 0 && isProviderFailoverError(error)) {
      throw error;
    }
    const text = await resolveRecoveryText({
      candidates: input.candidates,
      error,
      messages: input.messages,
      prefs: input.prefs,
      skipLabel: input.resolved.label,
      toolResults,
    });
    const recoveryParts = [
      ...buffer.filter((part) => part.type !== "error"),
      ...assistantTextParts(text),
    ];
    return new ReadableStream({
      start(controller) {
        for (const part of recoveryParts) {
          controller.enqueue(part);
        }
        controller.close();
      },
    });
  }

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
        await pumpRemaining(iterator, controller, {
          candidates: input.candidates,
          messages: input.messages,
          prefs: input.prefs,
          skipLabel: input.resolved.label,
          toolResults,
        });
      } catch (error) {
        const text = await resolveRecoveryText({
          candidates: input.candidates,
          error,
          messages: input.messages,
          prefs: input.prefs,
          skipLabel: input.resolved.label,
          toolResults,
        });
        try {
          closeWithAssistantText(controller, text);
        } catch {
          // Controller may already be closed.
        }
      }
    },
  });
}

async function tryProviderCandidate(input: {
  candidates: ResolvedOperatorModel[];
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
    maxRetries: 2,
    messages: input.messages,
    model,
    stopWhen: stepCountIs(8),
    system: buildSystemPrompt(input.resolved, input.prefs),
    tools: input.tools,
  });

  const stream = await openProviderStreamOrRecover({
    candidates: input.candidates,
    messages: input.messages,
    prefs: input.prefs,
    resolved: input.resolved,
    result,
  });

  return {
    label: input.resolved.label,
    provider: input.resolved.provider,
    stream,
  };
}

async function recoverWhenCandidatesExhausted(input: {
  config: AiHandlerConfig;
  lastError: unknown;
  prefs: UserPrefs | undefined;
}): Promise<{
  label: string;
  provider: ResolvedOperatorModel["provider"];
  stream: ReadableStream;
}> {
  try {
    return await capabilityOnlyRecovery(input);
  } catch (recoveryError) {
    if (isOperatorPitchDemo()) {
      return pitchDemoStream();
    }
    throw new Error(formatOperatorError(input.lastError ?? recoveryError), {
      cause: recoveryError,
    });
  }
}

async function failoverOrRecover(input: {
  candidates: ResolvedOperatorModel[];
  config: AiHandlerConfig;
  error: unknown;
  index: number;
  messages: Awaited<ReturnType<typeof convertToModelMessages>>;
  prefs: UserPrefs | undefined;
  resolved: ResolvedOperatorModel;
  tools: ReturnType<typeof buildOperatorTools>;
}): Promise<{
  label: string;
  provider: ResolvedOperatorModel["provider"];
  stream: ReadableStream;
}> {
  const { error, resolved } = input;
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

  if (canFailover) {
    return runCandidates({
      candidates: input.candidates,
      config: input.config,
      index: input.index + 1,
      lastError: error,
      messages: input.messages,
      prefs: input.prefs,
      tools: input.tools,
    });
  }

  if (isProviderFailoverError(error)) {
    try {
      return await capabilityOnlyRecovery({
        config: input.config,
        lastError: error,
        prefs: input.prefs,
      });
    } catch {
      if (isOperatorPitchDemo()) {
        return pitchDemoStream();
      }
    }
  }
  throw new Error(formatOperatorError(error), { cause: error });
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
    return recoverWhenCandidatesExhausted({
      config: input.config,
      lastError: input.lastError,
      prefs: input.prefs,
    });
  }

  try {
    return await tryProviderCandidate({
      candidates: input.candidates,
      messages: input.messages,
      prefs: input.prefs,
      resolved,
      tools: input.tools,
    });
  } catch (error) {
    return failoverOrRecover({
      candidates: input.candidates,
      config: input.config,
      error,
      index: input.index,
      messages: input.messages,
      prefs: input.prefs,
      resolved,
      tools: input.tools,
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
