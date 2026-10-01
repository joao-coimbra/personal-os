import { z } from "zod";

import {
  chunkNotionBlocks,
  markdownToNotionBlocks,
  type NotionBlock,
} from "./notion-blocks";

const pageSchema = z.object({
  id: z.string(),
  properties: z.record(z.string(), z.unknown()).optional(),
  url: z.string().optional(),
});

const NOTION_VERSION = "2022-06-28";

function notionHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

async function notionError(response: Response): Promise<never> {
  let detail = "";
  try {
    const body = (await response.json()) as {
      code?: string;
      message?: string;
    };
    detail = body.message ?? body.code ?? "";
  } catch {
    detail = "";
  }
  const suffix = detail ? ` — ${detail}` : "";
  throw new Error(`Notion API error: ${response.status}${suffix}`);
}

function pageParent(input: {
  parentDatabaseId?: string;
  parentPageId?: string;
  title: string;
}): Record<string, unknown> {
  if (input.parentDatabaseId) {
    return {
      parent: { database_id: input.parentDatabaseId },
      properties: {
        Name: { title: [{ text: { content: input.title } }] },
      },
    };
  }
  if (input.parentPageId) {
    return {
      parent: { page_id: input.parentPageId },
      properties: {
        title: { title: [{ text: { content: input.title } }] },
      },
    };
  }
  return {
    parent: { type: "workspace", workspace: true },
    properties: {
      title: { title: [{ text: { content: input.title } }] },
    },
  };
}

export async function notionSearch(accessToken: string, query: string) {
  const response = await fetch("https://api.notion.com/v1/search", {
    body: JSON.stringify({
      page_size: 20,
      query,
    }),
    headers: notionHeaders(accessToken),
    method: "POST",
  });
  if (!response.ok) {
    await notionError(response);
  }
  const data = (await response.json()) as { results: unknown[] };
  return z.array(pageSchema).parse(data.results);
}

export async function notionGetPage(accessToken: string, pageId: string) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: notionHeaders(accessToken),
  });
  if (!response.ok) {
    await notionError(response);
  }
  return pageSchema.parse(await response.json());
}

async function appendBlockBatch(
  accessToken: string,
  pageId: string,
  batch: NotionBlock[]
): Promise<number> {
  const response = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children`,
    {
      body: JSON.stringify({ children: batch }),
      headers: notionHeaders(accessToken),
      method: "PATCH",
    }
  );
  if (!response.ok) {
    await notionError(response);
  }
  return batch.length;
}

export async function notionAppendBlocks(
  accessToken: string,
  pageId: string,
  children: NotionBlock[]
): Promise<{ appended: number }> {
  if (children.length === 0) {
    return { appended: 0 };
  }
  let appended = 0;
  const batches = chunkNotionBlocks(children);
  for (const batch of batches) {
    // biome-ignore lint/performance/noAwaitInLoops: Notion append must be sequential per page
    appended += await appendBlockBatch(accessToken, pageId, batch);
  }
  return { appended };
}

export async function notionCreatePage(
  accessToken: string,
  input: {
    parentDatabaseId?: string;
    parentPageId?: string;
    title: string;
    content?: string;
  }
) {
  const blocks = input.content ? markdownToNotionBlocks(input.content) : [];
  const [firstBatch = [], ...restBatches] = chunkNotionBlocks(blocks);

  const body: Record<string, unknown> = pageParent(input);
  if (firstBatch.length > 0) {
    body.children = firstBatch;
  }

  const response = await fetch("https://api.notion.com/v1/pages", {
    body: JSON.stringify(body),
    headers: notionHeaders(accessToken),
    method: "POST",
  });
  if (!response.ok) {
    await notionError(response);
  }
  const page = pageSchema.parse(await response.json());

  let appended = firstBatch.length;
  for (const batch of restBatches) {
    // biome-ignore lint/performance/noAwaitInLoops: Notion append must be sequential
    const result = await notionAppendBlocks(accessToken, page.id, batch);
    appended += result.appended;
  }

  return {
    ...page,
    blocksAppended: appended,
    blocksCreated: blocks.length,
  };
}
