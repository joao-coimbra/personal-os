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

/** Trello REST via Atlassian OAuth 2.0 bearer access token. */
export async function trelloFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const url = new URL(`https://api.trello.com/1${path}`);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Trello API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function listMemberBoards(accessToken: string) {
  return await trelloFetch<Array<{ id: string; name: string }>>(
    "/members/me/boards",
    accessToken,
    { method: "GET" }
  );
}

export async function listBoardCards(accessToken: string, boardId: string) {
  const cards = await trelloFetch<unknown[]>(
    `/boards/${boardId}/cards`,
    accessToken,
    { method: "GET" }
  );
  return z.array(trelloCardSchema).parse(cards);
}

export async function createCard(
  accessToken: string,
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
    accessToken,
    {
      method: "POST",
    }
  );
}

export async function updateCard(
  accessToken: string,
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
    accessToken,
    {
      method: "PUT",
    }
  );
}
