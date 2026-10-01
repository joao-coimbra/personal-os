import { z } from "zod";

const eventSchema = z.object({
  end: z.object({
    date: z.string().optional(),
    dateTime: z.string().optional(),
  }),
  id: z.string(),
  start: z.object({
    date: z.string().optional(),
    dateTime: z.string().optional(),
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
    try {
      const body = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      detail = body.error?.message ?? body.error?.status ?? "";
    } catch {
      detail = "";
    }
    const suffix = detail ? ` — ${detail}` : "";
    throw new Error(`Google Calendar API error: ${response.status}${suffix}`);
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

export async function createEvent(
  accessToken: string,
  input: {
    calendarId?: string;
    summary: string;
    description?: string;
    start: string;
    end: string;
  }
) {
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  return await calendarFetch<CalendarEvent>(
    `/calendars/${calendarId}/events`,
    accessToken,
    {
      body: JSON.stringify({
        description: input.description,
        end: { dateTime: input.end },
        start: { dateTime: input.start },
        summary: input.summary,
      }),
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
    start?: string;
    end?: string;
  }
) {
  const calendarId = encodeURIComponent(input.calendarId ?? "primary");
  const eventId = encodeURIComponent(input.eventId);
  return await calendarFetch<CalendarEvent>(
    `/calendars/${calendarId}/events/${eventId}`,
    accessToken,
    {
      body: JSON.stringify({
        end: input.end ? { dateTime: input.end } : undefined,
        start: input.start ? { dateTime: input.start } : undefined,
        summary: input.summary,
      }),
      method: "PATCH",
    }
  );
}
