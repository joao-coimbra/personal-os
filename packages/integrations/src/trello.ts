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
    throw new Error(`Trello API error: ${response.status}`);
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
  const url = new URL("https://api.trello.com/1/members/me");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("token", "personalos-key-check");
  const response = await fetch(url);
  const body = (await response.text()).trim().toLowerCase();

  if (body.includes("invalid key")) {
    throw new Error(
      "Trello API key inválida (App not found). Crie um Power-Up em https://trello.com/power-ups/admin, gere a API Key e atualize TRELLO_API_KEY. Em Allowed origins inclua a URL do web (ex.: http://localhost:3001)."
    );
  }
}
