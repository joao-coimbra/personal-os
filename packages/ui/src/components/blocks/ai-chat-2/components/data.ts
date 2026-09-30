export type ModelRecord = {
  id: string;
  name: string;
  provider: string;
  /** Context window, unit free so the view owns the label. */
  context: string;
  /** Called out in the picker as the default for most work. */
  recommended?: boolean;
};

export const MODELS: ModelRecord[] = [
  {
    context: "200K",
    id: "anthropic",
    name: "Claude",
    provider: "Anthropic",
    recommended: true,
  },
  {
    context: "256K",
    id: "openai",
    name: "ChatGPT",
    provider: "OpenAI",
  },
  {
    context: "1M",
    id: "google",
    name: "Gemini",
    provider: "Google",
  },
];

export type PersonRecord = {
  name: string;
  initials: string;
  avatar: string;
};

/** The signed in person, so this one avatar stands in for your own user. */
export const MAYA: PersonRecord = {
  avatar: "https://github.com/shadcn.png",
  initials: "MC",
  name: "Maya Chen",
};

export const JONAS: PersonRecord = {
  avatar:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
  initials: "JW",
  name: "Jonas Weber",
};

export const PRIYA: PersonRecord = {
  avatar:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
  initials: "PN",
  name: "Priya Nair",
};

/** Everyone with the draft open, shown as a stack in the page header. */
export const COLLABORATORS: PersonRecord[] = [MAYA, JONAS, PRIYA];

/** The person typing in the panel. */
export const VIEWER = MAYA;

export const ASSISTANT_NAME = "PersonalOS AI";

const THREAD_TITLE = "Webhook section";
const THREAD_AT = "10:41";

export const DOC_FILENAME = "release-notes-3.4.md";

/** What Share copies. Point it at your real document route. */
export const DOC_SHARE_URL = "https://halcyon.app/docs/release-notes-3-4";

export const DOC_TITLE = "Release notes 3.4";

export const DOC_SHIPS = "Ships Aug 28";

export type DocSection = {
  id: string;
  heading: string;
  body: string[];
  bullets?: string[];
  /** Stands in until the section is written. */
  placeholder?: string;
};

/** The one section the assistant is drafting, and the only one Insert fills. */
export const DRAFT_SECTION_ID = "webhooks";

export type DraftPayload = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

/** Hard wrapped like a checked in .md file, and narrow enough that the draft
    never scrolls sideways inside the 345px panel viewport. */
const MARKDOWN_COLUMNS = 38;

function hardWrap(text: string, indent = "") {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > MARKDOWN_COLUMNS - indent.length && line) {
      lines.push(line);
      line = word;
      continue;
    }
    line = next;
  }
  if (line) {
    lines.push(line);
  }
  return lines.map((l, i) => (i === 0 ? l : `${indent}${l}`)).join("\n");
}

/** The reply renders this as markdown; Insert writes the same values as prose. */
function toMarkdown(draft: DraftPayload) {
  const blocks = [
    `## ${draft.heading}`,
    ...draft.paragraphs.map((p) => hardWrap(p)),
  ];
  if (draft.bullets) {
    blocks.push(draft.bullets.map((b) => `- ${hardWrap(b, "  ")}`).join("\n"));
  }
  return `${blocks.join("\n\n")}\n`;
}

const DRAFT_BODY = [
  "Refund confirmations now reach your endpoint within a minute of the refund itself. Between 08:46 and 09:12 on Aug 19, confirmations for 41 refunds were held while refund events without a payment reference were being rejected. A fix shipped the same morning, the held confirmations were replayed, and every confirmation was delivered.",
];

const DRAFT_LIST = [
  "Delivery is measured at your endpoint, not at our queue, so a slow endpoint still counts against the minute.",
  "A confirmation that fails retries for 24 hours with backoff before it is dropped.",
  "One still missing five minutes after a refund can be resent from Billing, then Refunds, then Resend confirmation. Resending never charges the customer twice.",
];

export const DOC_SECTIONS: DocSection[] = [
  {
    body: [
      "3.4 is a reliability release. Group sync runs on the same schedule as user sync, refund confirmations arrive in near real time, and large CSV exports finish instead of timing out at the gateway.",
    ],
    heading: "Highlights",
    id: "highlights",
  },
  {
    body: [
      "Groups created in your identity provider appear in Halcyon within one sync cycle, and nested groups resolve to their flattened membership.",
      "Removing someone from a group in Okta or Entra removes their access here on the next cycle, rather than waiting for a full directory sync.",
    ],
    heading: "SCIM group sync",
    id: "scim",
  },
  {
    body: [],
    heading: "Webhook reliability",
    id: DRAFT_SECTION_ID,
    placeholder: "Draft this from the Aug 19 incident notes.",
  },
  {
    body: [],
    bullets: [
      "CSV exports above 50,000 rows no longer time out at the gateway.",
      "The audit log keeps 400 days of history on Enterprise, up from 90.",
      "Deleting a workspace cancels its scheduled reports instead of leaving them queued.",
    ],
    heading: "Fixes and changes",
    id: "fixes",
  },
];

/** The assistant's full draft for the empty section. */
export const FULL_DRAFT: DraftPayload = {
  bullets: DRAFT_LIST,
  heading: "Webhook reliability",
  paragraphs: DRAFT_BODY,
};

/** The trimmed version, offered when the reader asks for two lines. */
export const SHORT_DRAFT: DraftPayload = {
  heading: "Webhook reliability",
  paragraphs: [
    "Refund confirmations now arrive within a minute of the refund. On Aug 19 a fix and a replay cleared 41 confirmations held from 08:46 to 09:12, and all of them were delivered.",
    "If one still looks stuck after five minutes, resend it from Billing, then Refunds, then Resend confirmation.",
  ],
};

export const FULL_DRAFT_MARKDOWN = toMarkdown(FULL_DRAFT);
export const SHORT_DRAFT_MARKDOWN = toMarkdown(SHORT_DRAFT);

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "code"; language: string; code: string; filename?: string };

export type ChatMessageRecord = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  at: string;
  /** The draft this reply offers to write into DRAFT_SECTION_ID. */
  draft?: DraftPayload;
  /** Next turns this reply invites. Only the newest reply's are shown. */
  followUps?: string[];
};

export type ThreadRecord = TranscriptRecord & {
  id: string;
  /** Names the thread in the panel header and on its Recent row. */
  title: string;
  /** Last activity, shown on the Recent row. */
  at: string;
};

export type TranscriptRecord = {
  /** Turns already committed to the thread. */
  messages: ChatMessageRecord[];
  /** Set only while a reply is still arriving. */
  pending?: {
    activityLabel: string;
    parts: MessagePart[];
    at: string;
    /** Appended when the run finishes on its own; withheld when stopped. */
    rest?: string;
    draft?: DraftPayload;
    followUps?: string[];
  };
  /** Labels the top of the visible scrollback. */
  separator?: string;
};

const WEBHOOK_THREAD: ThreadRecord = {
  at: THREAD_AT,
  id: "t_webhook",
  messages: [
    {
      at: "10:38",
      id: "m_01",
      parts: [
        {
          kind: "text",
          text: "webhook section is still empty. draft it from the incident thread, customer facing, no error codes",
        },
      ],
      role: "user",
    },
    {
      at: "10:38",
      id: "m_02",
      parts: [
        {
          kind: "text",
          text: "`th_9f2k4m` has it. `stripe-webhook.ts` started returning 500s on `charge.refunded` after the 3.4.0-rc deploy, because a refund event can arrive without a `payment_intent`. 41 confirmations queued from 08:46 to 09:12 on Aug 19. A null-guard patch falling back to the charge id plus a replay cleared 39; the last 2 were past Stripe's 3 day retry window and were resent from the Dashboard that morning. All 41 delivered, nothing lost.\n\nBefore I write it: name the outage window or keep it vague? And do you want the line about resending a stuck confirmation?",
        },
      ],
      role: "assistant",
    },
    {
      at: "10:40",
      id: "m_03",
      parts: [
        {
          kind: "text",
          text: "name the window, keep the resend line. no apology, we stayed inside the SLA",
        },
      ],
      role: "user",
    },
  ],
  pending: {
    activityLabel: "Drafting the webhook section",
    at: THREAD_AT,
    draft: FULL_DRAFT,
    followUps: ["Shorten to two lines", "Add the retry window"],
    parts: [
      {
        kind: "text",
        text: "Draft below. Window named, resend line kept, no apology.",
      },
      {
        code: FULL_DRAFT_MARKDOWN,
        filename: DOC_FILENAME,
        kind: "code",
        language: "markdown",
      },
      { kind: "text", text: "Tense matches Highlights" },
    ],
    rest: ", so you can drop it in without a second pass.",
  },
  separator: "Today",
  title: THREAD_TITLE,
};

const EXPORTS_THREAD: ThreadRecord = {
  at: "09:52",
  id: "t_exports",
  messages: [
    {
      at: "09:50",
      id: "e_01",
      parts: [
        {
          kind: "text",
          text: "fixes list says exports finish above 50,000 now. did we ever publish the old ceiling?",
        },
      ],
      role: "user",
    },
    {
      at: "09:52",
      followUps: ["List every number I need to verify"],
      id: "e_02",
      parts: [
        {
          kind: "text",
          text: "No. Support quoted 10,000 rows in tickets, but no doc, changelog or plan page carries it.\n\nSo `up from 10,000` would be a first claim rather than a correction. The fixes list already states the new number alone, which is the safer shape.",
        },
      ],
      role: "assistant",
    },
  ],
  separator: "Today",
  title: "Export ceiling",
};

const SCIM_THREAD: ThreadRecord = {
  at: "09:18",
  id: "t_scim",
  messages: [
    {
      at: "09:15",
      id: "s_01",
      parts: [
        {
          kind: "text",
          text: "scim section reads like docs, not release notes",
        },
      ],
      role: "user",
    },
    {
      at: "09:16",
      id: "s_02",
      parts: [
        {
          kind: "text",
          text: "It does. Both paragraphs explain how sync works instead of what changed in 3.4.\n\nThe change is the schedule. Group sync used to run on its own slower cycle, and now it runs with user sync. Lead on that and the mechanics can stay as the second sentence.",
        },
      ],
      role: "assistant",
    },
    {
      at: "09:18",
      id: "s_03",
      parts: [
        {
          kind: "text",
          text: "leave it, i'll redo that one after the freeze",
        },
      ],
      role: "user",
    },
    {
      at: "09:18",
      id: "s_04",
      parts: [
        {
          kind: "text",
          text: "Fine by me. It reads as accurate, just not as news.",
        },
      ],
      role: "assistant",
    },
  ],
  separator: "Today",
  title: "SCIM wording",
};

/** Every thread the panel can open. The first one is the one it boots into. */
export const THREADS: ThreadRecord[] = [
  WEBHOOK_THREAD,
  EXPORTS_THREAD,
  SCIM_THREAD,
];

/** Shown after New chat, scoped to the document the panel is reading. */
export const STARTERS = [
  "Organize meu dia com base nas tarefas e na agenda",
  "Quais tarefas estão atrasadas e o que priorizar?",
  "Resuma os próximos eventos e sugira blocos de foco",
];

export type ContextSource = {
  id: string;
  label: string;
  /** Second line in the Add context menu. */
  hint: string;
  kind: "section" | "thread";
};

/** What Add context can attach: the draft section and its source threads. */
export const CONTEXT_SOURCES: ContextSource[] = [
  {
    hint: "Section of this draft",
    id: "ctx_section",
    kind: "section",
    label: "Webhook reliability",
  },
  {
    hint: "Aug 19 incident thread",
    id: "ctx_incident",
    kind: "thread",
    label: "th_9f2k4m",
  },
  {
    hint: "CSV ceiling reports",
    id: "ctx_exports",
    kind: "thread",
    label: "Export tickets",
  },
];

/** Keyed on the terms the starters and follow ups use, so a send gets a real answer. */
const REPLY_LIBRARY: {
  match: string[];
  parts: MessagePart[];
  draft?: DraftPayload;
  followUps?: string[];
}[] = [
  {
    draft: FULL_DRAFT,
    followUps: ["Shorten to two lines", "Add the retry window"],
    // Retrying the seeded reply lands here, so a second pass answers the
    // question that is standing rather than falling through to a fallback.
    match: ["name the window", "resend line", "no apology"],
    parts: [
      {
        kind: "text",
        text: "Reran it. Same shape, because the window and the resend path both have to stay.",
      },
      {
        code: FULL_DRAFT_MARKDOWN,
        filename: DOC_FILENAME,
        kind: "code",
        language: "markdown",
      },
    ],
  },
  {
    draft: SHORT_DRAFT,
    followUps: ["Add the retry window", "Check the tone against 3.3"],
    match: ["shorten", "two lines", "shorter"],
    parts: [
      { kind: "text", text: "Two lines, same facts:" },
      {
        code: SHORT_DRAFT_MARKDOWN,
        filename: DOC_FILENAME,
        kind: "code",
        language: "markdown",
      },
    ],
  },
  {
    followUps: ["Shorten to two lines", "List every number I need to verify"],
    match: ["retry window", "retry"],
    parts: [
      {
        kind: "text",
        text: "The endpoint retries a failed confirmation for 24 hours with backoff, so a short outage never needs a manual resend. Worth a sentence, though it invites support questions about the schedule. I can fold it into the second paragraph.",
      },
    ],
  },
  {
    followUps: [
      "Check the tone against 3.3",
      "List every number I need to verify",
    ],
    match: ["summarize", "what changed", "3.4", "highlights"],
    parts: [
      {
        kind: "text",
        text: "Three customer visible changes:\n\nGroup sync now runs on the user sync schedule, so group membership stops drifting between full syncs.\n\nRefund confirmations arrive within a minute instead of on the next queue drain.\n\nCSV exports above 50,000 rows finish at the gateway instead of timing out.\n\nThe rest of 3.4 is internal and does not belong in these notes.",
      },
    ],
  },
  {
    followUps: ["List every number I need to verify"],
    match: ["tone", "3.3", "voice"],
    parts: [
      {
        kind: "text",
        text: "3.3 opened every section with the change, never with the incident. Two lines here break that: the Highlights paragraph leads with the release, and the fixes list leads with the gateway. Both read fine once the verb moves first.",
      },
    ],
  },
  {
    followUps: ["Check the tone against 3.3"],
    match: ["verify", "numbers", "check the numbers"],
    parts: [
      {
        kind: "text",
        text: "Every load bearing number has a source.\n\n41 confirmations and the 08:46 to 09:12 window come from the incident thread, 50,000 rows from the export tickets, and the 400 day audit retention from the retention policy page.\n\nThe one that needed checking was `within a minute`: the Aug 19 delivery histogram puts p95 at 41 seconds, so the claim holds.",
      },
    ],
  },
];

const FALLBACK_REPLIES: MessagePart[][] = [
  [
    {
      kind: "text",
      text: "Which section, Highlights or Fixes? They carry different tenses and I would rather not mix them.",
    },
  ],
  [
    {
      kind: "text",
      text: "Nothing in the 3.4 tickets covers that yet. Point me at the issue or the incident thread and I will pull the detail into the section you want.",
    },
  ],
  [
    {
      kind: "text",
      text: "One constraint first: the 3.4 freeze holds until Thursday, so anything that names new behavior ships in the 3.5 notes instead.",
    },
  ],
];

/** Repeat sends rotate the fallback, so the demo never answers twice alike. */
export function draftReply(
  prompt: string,
  turn = 0
): { parts: MessagePart[]; draft?: DraftPayload; followUps?: string[] } {
  const needle = prompt.toLowerCase();
  const hit = REPLY_LIBRARY.find((entry) =>
    entry.match.some((term) => needle.includes(term))
  );
  if (hit) {
    return {
      draft: hit.draft,
      followUps: hit.followUps,
      parts: hit.parts,
    };
  }

  // A reply that is asking for more information has nothing to suggest next.
  return { parts: FALLBACK_REPLIES[turn % FALLBACK_REPLIES.length] };
}
