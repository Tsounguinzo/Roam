import { describe, expect, it } from 'vitest';
import { isValidCalendarFeedUrl, normalizeCalendarFeedUrl, parseCalendarReminders } from '../../ui/settings/tabs/reminders/calendar';

describe('calendar reminders', () => {
  it('normalizes webcal URLs', () => {
    expect(normalizeCalendarFeedUrl('webcal://calendar.google.com/calendar/ical/test/basic.ics')).toBe(
      'https://calendar.google.com/calendar/ical/test/basic.ics',
    );
  });

  it('accepts HTTPS iCal feed URLs from any provider', () => {
    expect(isValidCalendarFeedUrl('https://calendar.google.com/calendar/ical/test/basic.ics')).toBe(true);
    expect(isValidCalendarFeedUrl('webcal://example.com/calendar.ics')).toBe(true);
    expect(isValidCalendarFeedUrl('ftp://example.com/calendar.ics')).toBe(false);
  });

  it('parses upcoming iCal events into reminders', () => {
    const reminders = parseCalendarReminders(
      [
        'BEGIN:VCALENDAR',
        'BEGIN:VEVENT',
        'UID:event-1',
        'SUMMARY:Planning\\, review',
        'DTSTART:20260707T150000Z',
        'END:VEVENT',
        'BEGIN:VEVENT',
        'UID:event-2',
        'SUMMARY:Past event',
        'DTSTART:20260701T150000Z',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\n'),
      'https://calendar.google.com/calendar/ical/test/basic.ics',
      15,
      new Date('2026-07-07T14:00:00Z'),
    );

    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      title: 'Planning, review',
      startsAt: '2026-07-07T15:00:00.000Z',
      leadMinutes: 15,
      enabled: true,
      source: 'calendar',
    });
  });
});
