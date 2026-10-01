/** Shared capability/tool error formatting for operator tools and AI streams. */

const CALENDAR_DISABLED_PATTERN =
  /Google Calendar API error:\s*403|calendar.*\b403\b|accessNotConfigured|Calendar API has not been used|SERVICE_DISABLED/i;

const CALENDAR_SCOPE_PATTERN =
  /insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient.?authentication.?scopes|Request had insufficient authentication scopes/i;

const CALENDAR_AUTH_PATTERN =
  /Connect google_calendar|calendar.*unauthorized|Google Calendar API error:\s*401/i;

const TRELLO_PATTERN = /Trello API error|Connect trello/i;

const NOTION_PATTERN = /Notion API error|Connect notion/i;

const NETWORK_PATTERN =
  /network error|failed to fetch|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|UND_ERR/i;

function errorMessages(error: unknown): string[] {
  const messages: string[] = [];
  let current: unknown = error;
  let depth = 0;
  while (current && depth < 4) {
    if (current instanceof Error) {
      messages.push(current.message);
      current = current.cause;
    } else {
      messages.push(String(current));
      break;
    }
    depth += 1;
  }
  return messages;
}

function messagesMatch(error: unknown, pattern: RegExp): boolean {
  return errorMessages(error).some((message) => pattern.test(message));
}

export function isCalendarDisabledError(error: unknown): boolean {
  if (messagesMatch(error, CALENDAR_SCOPE_PATTERN)) {
    return false;
  }
  return messagesMatch(error, CALENDAR_DISABLED_PATTERN);
}

export function isCalendarScopeError(error: unknown): boolean {
  return messagesMatch(error, CALENDAR_SCOPE_PATTERN);
}

export function formatCapabilityError(error: unknown): string {
  if (messagesMatch(error, CALENDAR_SCOPE_PATTERN)) {
    return "Google Calendar conectado sem permissão de escrita (falta o escopo calendar.events). Peça para reconectar em Integrações concedendo acesso para criar/editar eventos; continue com o restante do pedido.";
  }
  if (messagesMatch(error, CALENDAR_DISABLED_PATTERN)) {
    return "Google Calendar indisponível (API 403 ou desabilitada). Não foi possível criar/listar eventos. Continue com notas e tarefas, e avise o usuário para habilitar a Calendar API ou reconectar em Integrações.";
  }
  if (messagesMatch(error, CALENDAR_AUTH_PATTERN)) {
    return "Google Calendar não conectado ou sessão expirada. Peça para reconectar em Integrações; continue com o restante do pedido.";
  }
  if (messagesMatch(error, TRELLO_PATTERN)) {
    return "Trello indisponível ou não conectado. Peça para reconectar em Integrações.";
  }
  if (messagesMatch(error, NOTION_PATTERN)) {
    return "Notion indisponível ou não conectado. Peça para reconectar em Integrações.";
  }
  if (messagesMatch(error, NETWORK_PATTERN)) {
    return "Falha de rede ao consultar um serviço conectado. Tente de novo em instantes.";
  }
  const message = error instanceof Error ? error.message : String(error);
  return message || "Falha ao executar uma ferramenta do operador.";
}

export function capabilityErrorCode(error: unknown): string {
  if (messagesMatch(error, CALENDAR_SCOPE_PATTERN)) {
    return "calendar_scope";
  }
  if (messagesMatch(error, CALENDAR_DISABLED_PATTERN)) {
    return "calendar_disabled";
  }
  if (messagesMatch(error, CALENDAR_AUTH_PATTERN)) {
    return "calendar_auth";
  }
  if (messagesMatch(error, TRELLO_PATTERN)) {
    return "trello_error";
  }
  if (messagesMatch(error, NOTION_PATTERN)) {
    return "notion_error";
  }
  if (messagesMatch(error, NETWORK_PATTERN)) {
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
