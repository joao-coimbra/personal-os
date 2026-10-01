import { z } from "zod";

const eventSchema = z.object({
  description: z.string().optional(),
  end: z.object({
    date: z.string().optional(),
    dateTime: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  htmlLink: z.string().optional(),
  id: z.string(),
  start: z.object({
    date: z.string().optional(),
    dateTime: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  summary: z.string().optional(),
});

export type CalendarEvent = z.infer<typeof eventSchema>;

async function calendarFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    }
  );
  if (!response.ok) {
    let detail = "";
    let reason = "";
    try {
      const body = (await response.json()) as {
        error?: {
          message?: string;
          status?: string;
          errors?: Array<{ reason?: string }>;
        };
      };
      detail = body.error?.message ?? body.error?.status ?? "";
      reason = body.error?.errors?.[0]?.reason ?? "";
    } catch {
      detail = "";
    }
    const suffix = detail ? ` — ${detail}` : "";
    const reasonSuffix = reason ? ` [${reason}]` : "";
    throw new Error(
      `Google Calendar API error: ${response.status}${suffix}${reasonSuffix}`
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function listEvents(
  accessToken: string,
  input: { calendarId?: string; timeMin: string; timeMax: string }
) {
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const params = new URLSearchParams({
    orderBy: "startTime",
    singleEvents: "true",
    timeMax: input.timeMax,
    timeMin: input.timeMin,
  });
  const data = await calendarFetch<{ items: unknown[] }>(
    `/calendars/${calendarId}/events?${params.toString()}`,
    accessToken
  );
  return z.array(eventSchema).parse(data.items ?? []);
}

function eventBody(input: {
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
  timeZone?: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.summary !== undefined) {
    body.summary = input.summary;
  }
  if (input.description !== undefined) {
    body.description = input.description;
  }
  if (input.start) {
    body.start = input.timeZone
      ? { dateTime: input.start, timeZone: input.timeZone }
      : { dateTime: input.start };
  }
  if (input.end) {
    body.end = input.timeZone
      ? { dateTime: input.end, timeZone: input.timeZone }
      : { dateTime: input.end };
  }
  return body;
}

export async function createEvent(
  accessToken: string,
  input: {
    calendarId?: string;
    summary: string;
    description?: string;
    start: string;
    end: string;
    timeZone?: string;
  }
) {
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  return await calendarFetch<CalendarEvent>(
    `/calendars/${calendarId}/events`,
    accessToken,
    {
      body: JSON.stringify(
        eventBody({
          description: input.description,
          end: input.end,
          start: input.start,
          summary: input.summary,
          timeZone: input.timeZone,
        })
      ),
      method: "POST",
    }
  );
}

export async function updateEvent(
  accessToken: string,
  input: {
    calendarId?: string;
    eventId: string;
    summary?: string;
    description?: string;
    start?: string;
    end?: string;
    timeZone?: string;
  }
) {
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const eventId = encodeURIComponent(input.eventId);
  return await calendarFetch<CalendarEvent>(
    `/calendars/${calendarId}/events/${eventId}`,
    accessToken,
    {
      body: JSON.stringify(
        eventBody({
          description: input.description,
          end: input.end,
          start: input.start,
          summary: input.summary,
          timeZone: input.timeZone,
        })
      ),
      method: "PATCH",
    }
  );
}

export async function deleteEvent(
  accessToken: string,
  input: { calendarId?: string; eventId: string }
): Promise<{ deleted: true; eventId: string }> {
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const eventId = encodeURIComponent(input.eventId);
  await calendarFetch<undefined>(
    `/calendars/${calendarId}/events/${eventId}`,
    accessToken,
    { method: "DELETE" }
  );
  return { deleted: true, eventId: input.eventId };
}
