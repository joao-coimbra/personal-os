import { z } from "zod";

const trelloCardSchema = z.object({
  closed: z.boolean(),
  desc: z.string(),
  due: z.string().nullable(),
  id: z.string(),
  idBoard: z.string(),
  idList: z.string(),
  name: z.string(),
  shortUrl: z.string().optional(),
});

export type TrelloCard = z.infer<typeof trelloCardSchema>;

const CLASSIC_TRELLO_API_KEY = /^[0-9a-f]{32}$/i;

/** Classic Power-Up API keys are 32 hex chars (Trello Auth tab), not OAuth client ids. */
export function isClassicTrelloApiKey(apiKey: string): boolean {
  return CLASSIC_TRELLO_API_KEY.test(apiKey.trim());
}

/** Trello REST via classic key + user token query params. */
export async function trelloFetch<T>(
  path: string,
  token: string,
  apiKey: string,
  init?: RequestInit
): Promise<T> {
  const url = new URL(`https://api.trello.com/1${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", token);
  const response = await fetch(url, init);
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    throw new Error(
      `Trello API error: ${response.status}${detail ? ` ${detail}` : ""}`
    );
  }
  return response.json() as Promise<T>;
}

export async function listMemberBoards(token: string, apiKey: string) {
  return await trelloFetch<Array<{ id: string; name: string }>>(
    "/members/me/boards",
    token,
    apiKey,
    { method: "GET" }
  );
}

export async function listBoardCards(
  token: string,
  apiKey: string,
  boardId: string
) {
  const cards = await trelloFetch<unknown[]>(
    `/boards/${boardId}/cards`,
    token,
    apiKey,
    { method: "GET" }
  );
  return z.array(trelloCardSchema).parse(cards);
}

export async function createCard(
  token: string,
  apiKey: string,
  input: { idList: string; name: string; desc?: string; due?: string }
) {
  const params = new URLSearchParams({
    idList: input.idList,
    name: input.name,
  });
  if (input.desc) {
    params.set("desc", input.desc);
  }
  if (input.due) {
    params.set("due", input.due);
  }
  return await trelloFetch<TrelloCard>(
    `/cards?${params.toString()}`,
    token,
    apiKey,
    {
      method: "POST",
    }
  );
}

export async function updateCard(
  token: string,
  apiKey: string,
  cardId: string,
  input: {
    name?: string;
    desc?: string;
    due?: string;
    closed?: boolean;
    idList?: string;
  }
) {
  const params = new URLSearchParams();
  if (input.name) {
    params.set("name", input.name);
  }
  if (input.desc) {
    params.set("desc", input.desc);
  }
  if (input.due) {
    params.set("due", input.due);
  }
  if (input.closed !== undefined) {
    params.set("closed", String(input.closed));
  }
  if (input.idList) {
    params.set("idList", input.idList);
  }
  return await trelloFetch<TrelloCard>(
    `/cards/${cardId}?${params.toString()}`,
    token,
    apiKey,
    {
      method: "PUT",
    }
  );
}

/**
 * Probes Trello with a dummy token. "invalid key" means the Power-Up API key
 * is wrong/revoked; "invalid token" means the key itself is accepted.
 */
export async function validateTrelloApiKey(apiKey: string): Promise<void> {
  if (!isClassicTrelloApiKey(apiKey)) {
    throw new Error(
      "TRELLO_API_KEY must be the classic Power-Up API Key (32 hex chars) from https://trello.com/power-ups/admin → your Power-Up → Trello Auth / API Key. Do not use the Atlassian OAuth 2.0 Client ID — Bearer JWTs from auth.atlassian.com are currently rejected by api.trello.com (400 invalid token)."
    );
  }

  const url = new URL("https://api.trello.com/1/members/me");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", "personalos-key-check");
  const response = await fetch(url);
  const body = (await response.text()).trim().toLowerCase();

  if (body.includes("invalid key")) {
    throw new Error(
      "Trello API key inválida (App not found). Crie/abra o Power-Up em https://trello.com/power-ups/admin, copie a API Key da aba Trello Auth, e atualize TRELLO_API_KEY. Em Allowed origins inclua a URL do web (ex.: http://localhost:3001)."
    );
  }
}
