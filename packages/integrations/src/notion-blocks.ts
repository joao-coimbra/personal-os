/** Convert markdown-ish text into Notion block children for page create/append. */

const RICH_TEXT_MAX = 2000;
const CHILDREN_PER_REQUEST = 100;

export interface NotionRichText {
  text: { content: string };
  type: "text";
}

export type NotionBlock =
  | {
      object: "block";
      type: "paragraph";
      paragraph: { rich_text: NotionRichText[] };
    }
  | {
      object: "block";
      type: "heading_1";
      heading_1: { rich_text: NotionRichText[] };
    }
  | {
      object: "block";
      type: "heading_2";
      heading_2: { rich_text: NotionRichText[] };
    }
  | {
      object: "block";
      type: "heading_3";
      heading_3: { rich_text: NotionRichText[] };
    }
  | {
      object: "block";
      type: "bulleted_list_item";
      bulleted_list_item: { rich_text: NotionRichText[] };
    }
  | {
      object: "block";
      type: "numbered_list_item";
      numbered_list_item: { rich_text: NotionRichText[] };
    }
  | {
      object: "block";
      type: "code";
      code: { language: string; rich_text: NotionRichText[] };
    }
  | {
      object: "block";
      type: "divider";
      divider: Record<string, never>;
    };

const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const BULLET_RE = /^[-*]\s+(.+)$/;
const NUMBERED_RE = /^\d+[.)]\s+(.+)$/;
const DIVIDER_RE = /^(-{3,}|\*{3,}|_{3,})$/;
const FENCE_RE = /^```([\w+-]*)\s*$/;

function richText(content: string): NotionRichText[] {
  if (!content) {
    return [];
  }
  const chunks: NotionRichText[] = [];
  for (let i = 0; i < content.length; i += RICH_TEXT_MAX) {
    chunks.push({
      text: { content: content.slice(i, i + RICH_TEXT_MAX) },
      type: "text",
    });
  }
  return chunks;
}

function paragraph(text: string): NotionBlock {
  return {
    object: "block",
    paragraph: { rich_text: richText(text) },
    type: "paragraph",
  };
}

function heading(level: 1 | 2 | 3, text: string): NotionBlock {
  const rich = { rich_text: richText(text) };
  if (level === 1) {
    return { heading_1: rich, object: "block", type: "heading_1" };
  }
  if (level === 2) {
    return { heading_2: rich, object: "block", type: "heading_2" };
  }
  return { heading_3: rich, object: "block", type: "heading_3" };
}

function bullet(text: string): NotionBlock {
  return {
    bulleted_list_item: { rich_text: richText(text) },
    object: "block",
    type: "bulleted_list_item",
  };
}

function numbered(text: string): NotionBlock {
  return {
    numbered_list_item: { rich_text: richText(text) },
    object: "block",
    type: "numbered_list_item",
  };
}

function codeBlock(text: string, language: string): NotionBlock {
  return {
    code: {
      language: language || "plain text",
      rich_text: richText(text),
    },
    object: "block",
    type: "code",
  };
}

function divider(): NotionBlock {
  return {
    divider: {},
    object: "block",
    type: "divider",
  };
}

function matchStructuredLine(line: string): NotionBlock | null {
  if (DIVIDER_RE.test(line.trim())) {
    return divider();
  }
  const headingMatch = line.match(HEADING_RE);
  if (headingMatch?.[1] && headingMatch[2]) {
    const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
    return heading(level, headingMatch[2].trim());
  }
  const bulletMatch = line.match(BULLET_RE);
  if (bulletMatch?.[1]) {
    return bullet(bulletMatch[1].trim());
  }
  const numberedMatch = line.match(NUMBERED_RE);
  if (numberedMatch?.[1]) {
    return numbered(numberedMatch[1].trim());
  }
  return null;
}

/** Best-effort markdown → Notion blocks. */
export function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  const source = markdown.replace(/\r\n/g, "\n").trim();
  if (!source) {
    return [];
  }

  const lines = source.split("\n");
  const blocks: NotionBlock[] = [];
  let paragraphBuf: string[] = [];
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraphBuf.join("\n").trim();
    paragraphBuf = [];
    if (text) {
      blocks.push(paragraph(text));
    }
  };

  for (const line of lines) {
    if (inCode) {
      if (FENCE_RE.test(line)) {
        blocks.push(codeBlock(codeLines.join("\n"), codeLang));
        inCode = false;
        codeLang = "";
        codeLines = [];
        continue;
      }
      codeLines.push(line);
      continue;
    }

    const fenceOpen = line.match(FENCE_RE);
    if (fenceOpen) {
      flushParagraph();
      inCode = true;
      codeLang = fenceOpen[1] || "plain text";
      codeLines = [];
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    const structured = matchStructuredLine(line);
    if (structured) {
      flushParagraph();
      blocks.push(structured);
      continue;
    }

    paragraphBuf.push(line);
  }

  if (inCode) {
    blocks.push(codeBlock(codeLines.join("\n"), codeLang));
  }
  flushParagraph();
  return blocks;
}

export function chunkNotionBlocks(
  blocks: NotionBlock[],
  size = CHILDREN_PER_REQUEST
): NotionBlock[][] {
  if (blocks.length === 0) {
    return [];
  }
  const chunks: NotionBlock[][] = [];
  for (let i = 0; i < blocks.length; i += size) {
    chunks.push(blocks.slice(i, i + size));
  }
  return chunks;
}

export { CHILDREN_PER_REQUEST, RICH_TEXT_MAX };
