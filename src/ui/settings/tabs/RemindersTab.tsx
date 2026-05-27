import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  NativeSelect,
  SegmentedControl,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconCalendar,
  IconClock,
  IconLock,
  IconLink,
  IconPalette,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconVolume,
} from '@tabler/icons-react';
import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  BANNER_THEMES,
  DEFAULT_REMINDER_PREFS,
  FLIER_COLORS,
  FLIER_HEADS,
  FONT_OPTIONS,
  LEAD_OPTIONS,
  REMINDERS_STORAGE_KEY,
  SOUND_OPTIONS,
  SPEED_OPTIONS,
  type ReminderPrefs,
  type FlightReminder,
} from './reminders/options';
import {
  REMINDER_BLADE_URL,
  REMINDER_FLIGHT_REQUEST_KEY,
  REMINDER_TEST_MESSAGE,
  createReminderFlightRequest,
  resolveReminderFlightAssets,
  type ReminderFlightRequest,
} from '../../reminders/flight';

type AppearancePanel = 'flier' | 'banner' | 'typo' | 'sound';

const mergePrefs = (value: Partial<ReminderPrefs> | null): ReminderPrefs => ({
  ...DEFAULT_REMINDER_PREFS,
  ...(value ?? {}),
  calendarLinks: Array.isArray(value?.calendarLinks) ? value.calendarLinks : [],
  reminders: Array.isArray(value?.reminders) ? value.reminders : [],
});

const readPrefs = (): ReminderPrefs => {
  try {
    return mergePrefs(JSON.parse(localStorage.getItem(REMINDERS_STORAGE_KEY) ?? 'null'));
  } catch {
    return mergePrefs(null);
  }
};

const formatDateTimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const reminderTimeLabel = (startsAt: string) => {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return 'No time set';

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function playTestSound(request: ReminderFlightRequest) {
  const { sound } = resolveReminderFlightAssets(request);
  if (!request.soundEnabled || !sound.url) return;

  try {
    const audio = new Audio(sound.url);
    audio.volume = 0.9;
    void audio.play();
  } catch {
    /* audio preview is best-effort */
  }
}

function RemindersTab() {
  const [prefs, setPrefs] = useState(readPrefs);
  const [reminderTitle, setReminderTitle] = useState('Meeting');
  const [reminderStartsAt, setReminderStartsAt] = useState(() => formatDateTimeLocal(new Date(Date.now() + 30 * 60_000)));
  const [calendarLink, setCalendarLink] = useState('');
  const [appearancePanel, setAppearancePanel] = useState<AppearancePanel>('flier');

  const sendFlightRequest = useCallback((request: ReminderFlightRequest) => {
    localStorage.setItem(REMINDER_FLIGHT_REQUEST_KEY, JSON.stringify(request));
    window.dispatchEvent(new CustomEvent(REMINDER_FLIGHT_REQUEST_KEY, { detail: request }));
  }, []);

  useEffect(() => {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const flightAssets = resolveReminderFlightAssets(createReminderFlightRequest(prefs, prefs.messageTemplate.replaceAll('{title}', 'Meeting').replaceAll('{minutes}', String(prefs.leadMinutes))));
  const { theme, head, color, font } = flightAssets;

  const updatePrefs = useCallback((patch: Partial<ReminderPrefs>) => {
    setPrefs((current) => ({ ...current, ...patch }));
  }, []);

  const addReminder = useCallback(() => {
    if (!reminderTitle.trim() || !reminderStartsAt) return;

    const reminder: FlightReminder = {
      id: crypto.randomUUID(),
      title: reminderTitle.trim(),
      startsAt: reminderStartsAt,
      leadMinutes: prefs.leadMinutes,
      enabled: true,
    };

    setPrefs((current) => ({ ...current, reminders: [reminder, ...current.reminders] }));
    setReminderTitle('Meeting');
    setReminderStartsAt(formatDateTimeLocal(new Date(Date.now() + 30 * 60_000)));
  }, [prefs.leadMinutes, reminderStartsAt, reminderTitle]);

  const removeReminder = useCallback((id: string) => {
    setPrefs((current) => ({ ...current, reminders: current.reminders.filter((reminder) => reminder.id !== id) }));
  }, []);

  const toggleReminder = useCallback((id: string, enabled: boolean) => {
    setPrefs((current) => ({
      ...current,
      reminders: current.reminders.map((reminder) => (reminder.id === id ? { ...reminder, enabled } : reminder)),
    }));
  }, []);

  const addCalendarLink = useCallback(() => {
    const nextLink = calendarLink.trim();
    if (!nextLink) return;

    setPrefs((current) => ({
      ...current,
      calendarLinks: current.calendarLinks.includes(nextLink) ? current.calendarLinks : [nextLink, ...current.calendarLinks],
    }));
    setCalendarLink('');
  }, [calendarLink]);

  const testFlight = useCallback(() => {
    const request = createReminderFlightRequest(prefs, REMINDER_TEST_MESSAGE);
    playTestSound(request);
    sendFlightRequest(request);
  }, [prefs, sendFlightRequest]);

  const leadData = useMemo(() => LEAD_OPTIONS.map((minutes) => ({ label: `${minutes} min`, value: String(minutes) })), []);

  return (
    <Box className="flex flex-col gap-5">
      <Box className="flex justify-end">
        <Button className="reminder-test-button" leftSection={<IconPlayerPlay size={18} />} onClick={testFlight}>
          Send a test flight
        </Button>
      </Box>
      <Box className="grid grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] gap-5 max-[1040px]:grid-cols-1">
        <Box className="flex flex-col gap-5">
          <section className="rounded-[var(--roam-wobble-a)] border-[2.5px] border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] p-5 shadow-[var(--roam-shadow)]">
            <Group justify="space-between" align="center" mb="md">
              <Box>
                <Text className="font-note text-[24px] text-[var(--roam-ink)]">Reminders</Text>
                <Text className="text-sm text-[var(--roam-muted)]">Create local fly-by reminders and control what the banner says.</Text>
              </Box>
            </Group>

            <Box className="grid grid-cols-[1fr_190px_auto] gap-3 max-[860px]:grid-cols-1">
              <TextInput label="Title" value={reminderTitle} onChange={(event) => setReminderTitle(event.currentTarget.value)} />
              <TextInput
                label="Starts at"
                type="datetime-local"
                value={reminderStartsAt}
                onChange={(event) => setReminderStartsAt(event.currentTarget.value)}
              />
              <Button className="self-end max-[860px]:self-auto" leftSection={<IconPlus size={16} />} onClick={addReminder}>
                Add
              </Button>
            </Box>

            <Box className="mt-4 grid grid-cols-[170px_1fr] gap-4 max-[720px]:grid-cols-1">
              <Box>
                <Text className="mb-2 font-note text-lg">Lead time</Text>
                <SegmentedControl
                  fullWidth
                  data={leadData}
                  value={String(prefs.leadMinutes)}
                  onChange={(value) => updatePrefs({ leadMinutes: Number(value) })}
                />
              </Box>
              <Box>
                <TextInput
                  label="Banner message"
                  value={prefs.messageTemplate}
                  onChange={(event) => updatePrefs({ messageTemplate: event.currentTarget.value })}
                />
                <Group gap="xs" mt="xs">
                  {['{title}', '{minutes}'].map((token) => (
                    <Button
                      key={token}
                      size="compact-sm"
                      variant="light"
                      onClick={() => updatePrefs({ messageTemplate: `${prefs.messageTemplate}${token}` })}
                    >
                      {token}
                    </Button>
                  ))}
                </Group>
              </Box>
            </Box>

            <Box className="mt-4 flex flex-col gap-2">
              {prefs.reminders.length === 0 ? (
                <Box className="rounded-[var(--roam-wobble-b)] border-2 border-dashed border-[var(--roam-ink)] bg-[var(--roam-paper)] p-4 text-sm text-[var(--roam-muted)]">
                  No reminders yet.
                </Box>
              ) : (
                prefs.reminders.map((reminder) => (
                  <Box
                    key={reminder.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-[var(--roam-wobble-b)] border-2 border-solid border-[var(--roam-ink)] bg-[var(--roam-paper)] px-3 py-2 max-[720px]:grid-cols-[auto_1fr_auto]"
                  >
                    <IconClock size={18} />
                    <Box>
                      <Text className="font-note text-lg leading-tight">{reminder.title}</Text>
                      <Text className="text-xs text-[var(--roam-muted)]">
                        {reminderTimeLabel(reminder.startsAt)} · {reminder.leadMinutes} min before
                      </Text>
                    </Box>
                    <Switch checked={reminder.enabled} onChange={(event) => toggleReminder(reminder.id, event.currentTarget.checked)} />
                    <ActionIcon variant="light" aria-label={`Remove ${reminder.title}`} onClick={() => removeReminder(reminder.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Box>
                ))
              )}
            </Box>
          </section>

          <section className="rounded-[var(--roam-wobble-b)] border-[2.5px] border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] p-5 shadow-[var(--roam-shadow)]">
            <Text className="font-note text-[24px] text-[var(--roam-ink)]">Flight</Text>
            <Box className="mt-4 grid grid-cols-2 gap-4 max-[720px]:grid-cols-1">
              <Box>
                <Text className="mb-2 font-note text-lg">Speed</Text>
                <SegmentedControl
                  fullWidth
                  data={SPEED_OPTIONS.map((speed) => ({ value: speed.value, label: speed.label }))}
                  value={prefs.speed}
                  onChange={(value) => updatePrefs({ speed: value as ReminderPrefs['speed'] })}
                />
              </Box>
              <NativeSelect
                label="Show on"
                value={prefs.targetDisplay}
                onChange={(event) => updatePrefs({ targetDisplay: event.currentTarget.value as ReminderPrefs['targetDisplay'] })}
                data={[
                  { value: 'cursor', label: 'Screen with my cursor' },
                  { value: 'primary', label: 'Main screen' },
                ]}
              />
              <Switch
                label="Fly again at meeting time"
                description="Send a second fly-by right when it starts"
                checked={prefs.flyAtStart}
                onChange={(event) => updatePrefs({ flyAtStart: event.currentTarget.checked })}
              />
              <Switch
                label="Engine sound"
                description="Play sound during reminders and test flights"
                checked={prefs.soundEnabled}
                onChange={(event) => updatePrefs({ soundEnabled: event.currentTarget.checked })}
              />
              <Switch
                label="Launch at login"
                checked={prefs.launchAtLogin}
                onChange={(event) => updatePrefs({ launchAtLogin: event.currentTarget.checked })}
              />
              <Switch
                label="Stay signed in"
                description="Keep calendar links in local preferences"
                checked={prefs.staySignedIn}
                onChange={(event) => updatePrefs({ staySignedIn: event.currentTarget.checked })}
              />
            </Box>
          </section>

          <section className="rounded-[var(--roam-wobble-a)] border-[2.5px] border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] p-5 shadow-[var(--roam-shadow)]">
            <Group justify="space-between" align="center" mb="md">
              <Box>
                <Text className="font-note text-[24px] text-[var(--roam-ink)]">Calendar</Text>
                <Text className="text-sm text-[var(--roam-muted)]">Store iCal links locally and use manual reminders while provider sync is wired in.</Text>
              </Box>
              <ActionIcon variant="light" aria-label="Refresh calendar preview">
                <IconRefresh size={18} />
              </ActionIcon>
            </Group>
            <Box className="grid grid-cols-[1fr_auto] gap-3 max-[720px]:grid-cols-1">
              <TextInput
                leftSection={<IconLink size={16} />}
                label="Calendar link"
                placeholder="https://example.com/calendar.ics"
                value={calendarLink}
                onChange={(event) => setCalendarLink(event.currentTarget.value)}
              />
              <Button className="self-end max-[720px]:self-auto" leftSection={<IconCalendar size={16} />} onClick={addCalendarLink}>
                Add link
              </Button>
            </Box>
            <Box className="mt-4 flex flex-col gap-2">
              {prefs.calendarLinks.length === 0 ? (
                <Text className="text-sm text-[var(--roam-muted)]">No calendar links connected.</Text>
              ) : (
                prefs.calendarLinks.map((link) => (
                  <Box key={link} className="flex items-center justify-between gap-3 rounded-[var(--roam-wobble-b)] border-2 border-solid border-[var(--roam-ink)] bg-[var(--roam-paper)] px-3 py-2">
                    <Text className="min-w-0 truncate text-sm">{link}</Text>
                    <ActionIcon
                      variant="light"
                      aria-label="Remove calendar link"
                      onClick={() => updatePrefs({ calendarLinks: prefs.calendarLinks.filter((item) => item !== link) })}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Box>
                ))
              )}
            </Box>
          </section>
        </Box>

        <Box className="flex flex-col gap-5">
          <section className="overflow-hidden rounded-[var(--roam-wobble-a)] border-[2.5px] border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] shadow-[var(--roam-shadow)]">
            <Box className="reminder-preview">
              <Box
                className="reminder-preview-rig"
                style={{
                  '--reminder-stripe-a': theme.a,
                  '--reminder-stripe-b': theme.b,
                  '--reminder-banner-text': theme.text,
                  '--reminder-banner-font': font.stack,
                } as CSSProperties}
              >
                <Box className="reminder-banner">
                  <span>{prefs.messageTemplate.replaceAll('{title}', 'Meeting').replaceAll('{minutes}', String(prefs.leadMinutes))}</span>
                </Box>
                <Box className="reminder-rope" />
                <Box className="reminder-flier">
                  <img className="reminder-plane-body" src={color.base} alt="" />
                  <img className="reminder-head" src={head.image} alt="" />
                  <img className="reminder-blade" src={REMINDER_BLADE_URL} alt="" />
                </Box>
              </Box>
            </Box>
            <Box className="p-5">
              <Group gap="xs">
                <Badge leftSection={<IconPalette size={13} />} variant="light">
                  {theme.name}
                </Badge>
                <Badge leftSection={<IconVolume size={13} />} variant="light">
                  {SOUND_OPTIONS.find((sound) => sound.id === prefs.soundPack)?.name ?? 'Sound'}
                </Badge>
              </Group>
            </Box>
          </section>

          <section className="rounded-[var(--roam-wobble-b)] border-[2.5px] border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] p-5 shadow-[var(--roam-shadow)]">
            <Text className="font-note text-[24px] text-[var(--roam-ink)]">Appearance</Text>
            <Box className="reminder-subnav" role="tablist" aria-label="Appearance sections">
              {[
                ['flier', 'Flier'],
                ['banner', 'Banner'],
                ['typo', 'Typo'],
                ['sound', 'Sound'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`reminder-subnav-item ${appearancePanel === value ? 'reminder-subnav-item-active' : ''}`}
                  onClick={() => setAppearancePanel(value as AppearancePanel)}
                >
                  {label}
                </button>
              ))}
            </Box>

            {appearancePanel === 'flier' && (
              <>
                <Text className="mt-4 font-note text-lg">Head</Text>
                <Box className="mt-2 grid grid-cols-3 gap-3 max-[720px]:grid-cols-2">
                  {FLIER_HEADS.map((item) => {
                    const locked = !item.free;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`reminder-swatch reminder-swatch-large ${prefs.flierHead === item.id ? 'reminder-swatch-selected' : ''} ${locked ? 'reminder-swatch-locked' : ''}`}
                        onClick={() => !locked && updatePrefs({ flierHead: item.id, soundPack: item.sound })}
                      >
                        <span className="reminder-lock">{locked && <IconLock size={16} />}</span>
                        <span className="reminder-swatch-art">
                          {item.thumb ? <img src={item.thumb} alt="" /> : <span className="reminder-missing-art">{item.name.slice(0, 1)}</span>}
                        </span>
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </Box>

                <Text className="mt-4 font-note text-lg">Plane color</Text>
                <Box className="mt-2 grid grid-cols-3 gap-3 max-[720px]:grid-cols-2">
                  {FLIER_COLORS.map((item) => {
                    const locked = !item.free;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`reminder-swatch reminder-swatch-large ${prefs.flierColor === item.id ? 'reminder-swatch-selected' : ''} ${locked ? 'reminder-swatch-locked' : ''}`}
                        onClick={() => !locked && updatePrefs({ flierColor: item.id })}
                      >
                        <span className="reminder-lock">{locked && <IconLock size={16} />}</span>
                        <span className="reminder-swatch-art reminder-plane-thumb">
                          {item.plane ? <img src={item.plane} alt="" /> : <span className="reminder-missing-art">{item.name.slice(0, 1)}</span>}
                        </span>
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </Box>
              </>
            )}

            {appearancePanel === 'banner' && (
              <Box className="mt-4 grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                {BANNER_THEMES.map((item) => {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`reminder-banner-tile ${prefs.theme === item.id ? 'reminder-swatch-selected' : ''}`}
                      onClick={() => updatePrefs({ theme: item.id })}
                    >
                      <span
                        className="reminder-theme-strip"
                        style={{ background: `repeating-linear-gradient(-8deg, ${item.a} 0 10px, ${item.b} 10px 20px)` }}
                      />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </Box>
            )}

            {appearancePanel === 'typo' && (
              <Box className="mt-4 grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                {FONT_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`reminder-swatch ${prefs.font === item.id ? 'reminder-swatch-selected' : ''}`}
                    onClick={() => updatePrefs({ font: item.id })}
                  >
                    <span className="reminder-font-sample" style={{ fontFamily: item.stack }}>Hello</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </Box>
            )}

            {appearancePanel === 'sound' && (
              <Box className="mt-4 grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                {SOUND_OPTIONS.map((item) => {
                  const locked = !item.free;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`reminder-swatch ${prefs.soundPack === item.id ? 'reminder-swatch-selected' : ''} ${locked ? 'reminder-swatch-locked' : ''}`}
                      onClick={() => !locked && updatePrefs({ soundPack: item.id })}
                    >
                      <span className="reminder-lock">{locked && <IconLock size={16} />}</span>
                      <IconVolume size={24} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </Box>
            )}
          </section>
        </Box>
      </Box>
    </Box>
  );
}

export default memo(RemindersTab);
