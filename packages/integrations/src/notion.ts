import { z } from "zod";

const pageSchema = z.object({
  id: z.string(),
  properties: z.record(z.string(), z.unknown()).optional(),
  url: z.string().optional(),
});

export async function notionSearch(accessToken: string, query: string) {
  const response = await fetch("https://api.notion.com/v1/search", {
    body: JSON.stringify({
      page_size: 20,
      query,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Notion API error: ${response.status}`);
  }
  const data = (await response.json()) as { results: unknown[] };
  return z.array(pageSchema).parse(data.results);
}

export async function notionGetPage(accessToken: string, pageId: string) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
    },
  });
  if (!response.ok) {
    throw new Error(`Notion API error: ${response.status}`);
  }
  return pageSchema.parse(await response.json());
}

export async function notionCreatePage(
  accessToken: string,
  input: { parentDatabaseId?: string; title: string; content?: string }
) {
  const body: Record<string, unknown> = input.parentDatabaseId
    ? {
        parent: { database_id: input.parentDatabaseId },
        properties: {
          Name: { title: [{ text: { content: input.title } }] },
        },
      }
    : {
        parent: { type: "workspace", workspace: true },
        properties: {
          title: { title: [{ text: { content: input.title } }] },
        },
      };

  if (input.content) {
    body.children = [
      {
        object: "block",
        paragraph: {
          rich_text: [{ text: { content: input.content }, type: "text" }],
        },
        type: "paragraph",
      },
    ];
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Notion API error: ${response.status}`);
  }
  return pageSchema.parse(await response.json());
}
