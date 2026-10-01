/** Shared capability/tool error formatting for operator tools and AI streams. */

const CALENDAR_DISABLED_PATTERN =
  /Google Calendar API error:\s*403|calendar.*\b403\b|accessNotConfigured|Calendar API has not been used|SERVICE_DISABLED/i;

const CALENDAR_AUTH_PATTERN =
  /Connect google_calendar|calendar.*unauthorized|Google Calendar API error:\s*401/i;

const TRELLO_PATTERN = /Trello API error|Connect trello/i;

const NOTION_PATTERN = /Notion API error|Connect notion/i;

const NETWORK_PATTERN =
  /network error|failed to fetch|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|UND_ERR/i;

export function isCalendarDisabledError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return CALENDAR_DISABLED_PATTERN.test(message);
}

export function formatCapabilityError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (CALENDAR_DISABLED_PATTERN.test(message)) {
    return "Google Calendar indisponível (API 403 ou desabilitada). Não foi possível criar/listar eventos. Continue com notas e tarefas, e avise o usuário para habilitar a Calendar API ou reconectar em Integrações.";
  }
  if (CALENDAR_AUTH_PATTERN.test(message)) {
    return "Google Calendar não conectado ou sessão expirada. Peça para reconectar em Integrações; continue com o restante do pedido.";
  }
  if (TRELLO_PATTERN.test(message)) {
    return "Trello indisponível ou não conectado. Peça para reconectar em Integrações.";
  }
  if (NOTION_PATTERN.test(message)) {
    return "Notion indisponível ou não conectado. Peça para reconectar em Integrações.";
  }
  if (NETWORK_PATTERN.test(message)) {
    return "Falha de rede ao consultar um serviço conectado. Tente de novo em instantes.";
  }
  return message || "Falha ao executar uma ferramenta do operador.";
}

export function capabilityErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (CALENDAR_DISABLED_PATTERN.test(message)) {
    return "calendar_disabled";
  }
  if (CALENDAR_AUTH_PATTERN.test(message)) {
    return "calendar_auth";
  }
  if (TRELLO_PATTERN.test(message)) {
    return "trello_error";
  }
  if (NOTION_PATTERN.test(message)) {
    return "notion_error";
  }
  if (NETWORK_PATTERN.test(message)) {
    return "network_error";
  }
  return "tool_error";
}

export interface SoftToolFailure {
  code: string;
  error: string;
  ok: false;
}

export async function softToolResult<T>(
  fn: () => Promise<T>
): Promise<T | SoftToolFailure> {
  try {
    return await fn();
  } catch (error) {
    return {
      code: capabilityErrorCode(error),
      error: formatCapabilityError(error),
      ok: false,
    };
  }
}
