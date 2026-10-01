import { z } from "zod";

const trelloCardSchema = z.object({
  closed: z.boolean(),
  desc: z.string(),
  due: z.string().nullable(),
  id: z.string(),
  idBoard: z.string(),
  idLabels: z.array(z.string()).optional().default([]),
  idList: z.string(),
  labels: z
    .array(
      z.object({
        color: z.string().nullable().optional(),
        id: z.string(),
        name: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  name: z.string(),
  shortUrl: z.string().optional(),
});

export type TrelloCard = z.infer<typeof trelloCardSchema>;

const trelloLabelSchema = z.object({
  color: z.string().nullable().optional(),
  id: z.string(),
  name: z.string().optional(),
});

export type TrelloLabel = z.infer<typeof trelloLabelSchema>;

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

const trelloListSchema = z.object({
  closed: z.boolean(),
  id: z.string(),
  name: z.string(),
  pos: z.number(),
});

export type TrelloList = z.infer<typeof trelloListSchema>;

export async function listBoardLists(
  token: string,
  apiKey: string,
  boardId: string
) {
  const lists = await trelloFetch<unknown[]>(
    `/boards/${boardId}/lists`,
    token,
    apiKey,
    { method: "GET" }
  );
  return z
    .array(trelloListSchema)
    .parse(lists)
    .filter((list) => !list.closed)
    .toSorted((a, b) => a.pos - b.pos);
}

export async function createBoard(
  token: string,
  apiKey: string,
  input: { name: string; desc?: string; defaultLists?: boolean }
) {
  const params = new URLSearchParams({
    defaultLists: String(input.defaultLists ?? false),
    name: input.name,
  });
  if (input.desc) {
    params.set("desc", input.desc);
  }
  return await trelloFetch<{ id: string; name: string; shortUrl?: string }>(
    `/boards/?${params.toString()}`,
    token,
    apiKey,
    { method: "POST" }
  );
}

export async function createList(
  token: string,
  apiKey: string,
  input: { idBoard: string; name: string; pos?: number | string }
) {
  const params = new URLSearchParams({
    idBoard: input.idBoard,
    name: input.name,
  });
  if (input.pos !== undefined) {
    params.set("pos", String(input.pos));
  }
  return await trelloFetch<TrelloList>(
    `/lists?${params.toString()}`,
    token,
    apiKey,
    {
      method: "POST",
    }
  );
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
    idLabels?: string[];
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
  if (input.idLabels) {
    params.set("idLabels", input.idLabels.join(","));
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

export async function listBoardLabels(
  token: string,
  apiKey: string,
  boardId: string
) {
  const labels = await trelloFetch<unknown[]>(
    `/boards/${boardId}/labels`,
    token,
    apiKey,
    { method: "GET" }
  );
  return z.array(trelloLabelSchema).parse(labels);
}

export async function createBoardLabel(
  token: string,
  apiKey: string,
  input: { idBoard: string; name: string; color?: string }
) {
  const params = new URLSearchParams({
    idBoard: input.idBoard,
    name: input.name,
  });
  if (input.color) {
    params.set("color", input.color);
  }
  return await trelloFetch<TrelloLabel>(
    `/labels?${params.toString()}`,
    token,
    apiKey,
    { method: "POST" }
  );
}

export async function addLabelToCard(
  token: string,
  apiKey: string,
  cardId: string,
  labelId: string
) {
  const params = new URLSearchParams({ value: labelId });
  return await trelloFetch<{ id: string }>(
    `/cards/${cardId}/idLabels?${params.toString()}`,
    token,
    apiKey,
    { method: "POST" }
  );
}
