import { invoke } from '@tauri-apps/api/core';
import type { FlightReminder } from './options';

export interface CalendarReminder extends FlightReminder {
  source: 'calendar' | 'google';
}

const UPCOMING_WINDOW_MS = 14 * 24 * 60 * 60_000;
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export const GOOGLE_CALENDAR_TOKEN_STORAGE_KEY = 'roam-google-calendar-token';

interface GoogleCalendarToken {
  accessToken: string;
  expiresAt: number;
  scope: string;
}

interface GoogleCalendarEvent {
  id?: string;
  status?: string;
  summary?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
}

interface NativeGoogleCalendarToken {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

const unfoldIcsLines = (text: string) => {
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];

  rawLines.forEach((line) => {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
      return;
    }

    lines.push(line);
  });

  return lines;
};

const parseIcsValue = (line: string) => {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) return null;

  const name = line.slice(0, separatorIndex).split(';')[0].toUpperCase();
  const value = line.slice(separatorIndex + 1);

  return { name, value };
};

const parseIcsDate = (value: string) => {
  const dateOnlyMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const dateTimeMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!dateTimeMatch) return null;

  const [, year, month, day, hour, minute, second, utc] = dateTimeMatch;
  const parts = [Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)] as const;

  return utc
    ? new Date(Date.UTC(...parts))
    : new Date(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]);
};

const cleanIcsText = (value: string) =>
  value
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();

export const normalizeGoogleCalendarUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('webcal://')) return `https://${trimmed.slice('webcal://'.length)}`;
  return trimmed;
};

export const normalizeCalendarFeedUrl = normalizeGoogleCalendarUrl;

export const isValidCalendarFeedUrl = (value: string) => {
  const normalized = normalizeCalendarFeedUrl(value);

  try {
    const url = new URL(normalized);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const parseCalendarReminders = (
  icsText: string,
  sourceUrl: string,
  leadMinutes: number,
  now = new Date(),
): CalendarReminder[] => {
  const nowTime = now.getTime();
  const maxTime = nowTime + UPCOMING_WINDOW_MS;
  const reminders: CalendarReminder[] = [];
  let inEvent = false;
  let title = '';
  let startsAt: Date | null = null;
  let uid = '';

  unfoldIcsLines(icsText).forEach((line) => {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      title = '';
      startsAt = null;
      uid = '';
      return;
    }

    if (line === 'END:VEVENT') {
      if (startsAt && startsAt.getTime() > nowTime && startsAt.getTime() <= maxTime) {
        reminders.push({
          id: `calendar:${sourceUrl}:${uid || startsAt.toISOString()}:${title}`,
          title: title || 'Calendar event',
          startsAt: startsAt.toISOString(),
          leadMinutes,
          enabled: true,
          source: 'calendar',
        });
      }

      inEvent = false;
      return;
    }

    if (!inEvent) return;

    const parsed = parseIcsValue(line);
    if (!parsed) return;

    if (parsed.name === 'SUMMARY') title = cleanIcsText(parsed.value);
    if (parsed.name === 'UID') uid = cleanIcsText(parsed.value);
    if (parsed.name === 'DTSTART') startsAt = parseIcsDate(parsed.value);
  });

  return reminders.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
};

export const fetchCalendarReminders = async (
  calendarLinks: string[],
  leadMinutes: number,
): Promise<CalendarReminder[]> => {
  const reminderGroups = await Promise.all(
    calendarLinks.map(async (link) => {
      const url = normalizeGoogleCalendarUrl(link);
      if (!url) return [];

      const response = await fetch(url);
      if (!response.ok) return [];

      return parseCalendarReminders(await response.text(), url, leadMinutes);
    }),
  );

  return reminderGroups.flat();
};

const parseGoogleEventStart = (event: GoogleCalendarEvent) => {
  if (event.start?.dateTime) {
    const date = new Date(event.start.dateTime);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (event.start?.date) {
    const date = new Date(`${event.start.date}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const isGoogleCalendarDesktopOAuthConfigured = () =>
  invoke<boolean>('is_google_calendar_desktop_oauth_configured').catch(() => false);

export const readGoogleCalendarToken = (): GoogleCalendarToken | null => {
  try {
    const token = JSON.parse(localStorage.getItem(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY) ?? 'null') as Partial<GoogleCalendarToken> | null;
    if (!token?.accessToken || !token.expiresAt || token.expiresAt <= Date.now()) return null;
    return {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      scope: token.scope ?? GOOGLE_CALENDAR_SCOPE,
    };
  } catch {
    return null;
  }
};

const writeGoogleCalendarToken = (token: GoogleCalendarToken) => {
  localStorage.setItem(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY, JSON.stringify(token));
  window.dispatchEvent(new CustomEvent(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY, { detail: token }));
};

export const clearGoogleCalendarToken = () => {
  localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY));
};

export const requestGoogleCalendarToken = async () => {
  const response = await invoke<NativeGoogleCalendarToken>('connect_google_calendar_desktop');
  const token = {
    accessToken: response.access_token,
    expiresAt: Date.now() + Math.max(60, response.expires_in ?? 3600) * 1000,
    scope: response.scope ?? GOOGLE_CALENDAR_SCOPE,
  };

  writeGoogleCalendarToken(token);
  return token;
};

export const revokeGoogleCalendarToken = async () => {
  clearGoogleCalendarToken();
};

export const fetchGoogleCalendarReminders = async (
  accessToken: string,
  leadMinutes: number,
  now = new Date(),
): Promise<CalendarReminder[]> => {
  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + UPCOMING_WINDOW_MS).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return [];

  const payload = await response.json() as { items?: GoogleCalendarEvent[] };
  return (payload.items ?? [])
    .filter((event) => event.status !== 'cancelled')
    .flatMap((event): CalendarReminder[] => {
      const startsAt = parseGoogleEventStart(event);
      if (!startsAt) return [];

      return [{
        id: `google:${event.id ?? startsAt.toISOString()}`,
        title: event.summary?.trim() || 'Google Calendar event',
        startsAt: startsAt.toISOString(),
        leadMinutes,
        enabled: true,
        source: 'google' as const,
      }];
    });
};
