import {
  ActionIcon,
  Box,
  Button,
  Group,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconBrandGoogle,
  IconCalendarPlus,
  IconClock,
  IconLink,
  IconLogout,
  IconPlayerPlay,
  IconPlus,
  IconTrash,
  IconVolume,
} from '@tabler/icons-react';
import { memo, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BANNER_THEMES,
  DEFAULT_REMINDER_PREFS,
  FLIER_COLORS,
  FLIER_HEADS,
  FONT_OPTIONS,
  LEAD_OPTIONS,
  getReminderBannerSizeStyle,
  readReminderPrefs,
  SOUND_OPTIONS,
  SPEED_OPTIONS,
  writeReminderPrefs,
  type ReminderPrefs,
  type FlightReminder,
} from './reminders/options';
import {
  GOOGLE_CALENDAR_TOKEN_STORAGE_KEY,
  isGoogleCalendarDesktopOAuthConfigured,
  isValidCalendarFeedUrl,
  normalizeCalendarFeedUrl,
  readGoogleCalendarToken,
  requestGoogleCalendarToken,
  revokeGoogleCalendarToken,
} from './reminders/calendar';
import {
  REMINDER_BLADE_URL,
  REMINDER_FLIGHT_REQUEST_KEY,
  REMINDER_TEST_MESSAGE,
  createReminderFlightRequest,
  resolveReminderFlightAssets,
  type ReminderFlightRequest,
} from '../../reminders/flight';
import ReminderBanner from '../../reminders/ReminderBanner';
import SectionCard from '../layout/SectionCard';
import { SettingsTabId } from '../../../types/ISetting';
import {
  REMINDER_OWNED_ITEMS_CHANGED,
  readOwnedReminderItems,
  ownsReminderItem,
  type OwnedReminderItems,
} from './reminders/ownership';

type AppearancePanel = 'avatar' | 'plane' | 'banner' | 'text' | 'sound';

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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
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

function playSoundPreview(url: string | undefined) {
  if (!url) return;

  try {
    const audio = new Audio(url);
    audio.volume = 0.9;
    void audio.play();
  } catch {
    /* sound previews are best-effort */
  }
}

function BannerWaveFilter() {
  return (
    <svg className="reminder-banner-filters" aria-hidden="true" width="0" height="0">
      <defs>
        <filter id="banner-wave" x="-20%" y="-60%" width="140%" height="220%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.024" numOctaves="1" seed="7" result="noise" />
          <feOffset in="noise" dx="0" dy="0" result="noiseShift">
            <animate
              attributeName="dx"
              dur="3.2s"
              values="0;110;0"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              repeatCount="indefinite"
            />
            <animate
              attributeName="dy"
              dur="2.4s"
              values="0;26;0"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              repeatCount="indefinite"
            />
          </feOffset>
          <feDisplacementMap in="SourceGraphic" in2="noiseShift" scale="20" xChannelSelector="R" yChannelSelector="G">
            <animate
              attributeName="scale"
              dur="2.2s"
              values="16;30;16"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
              repeatCount="indefinite"
            />
          </feDisplacementMap>
        </filter>
      </defs>
    </svg>
  );
}

interface StorePromptProps {
  category: AppearancePanel;
  onOpenStore: (category: AppearancePanel) => void;
}

function StorePrompt({ category, onOpenStore }: StorePromptProps) {
  return (
    <Box className="mt-4 rounded-[var(--roam-wobble-b)] border-2 border-dashed border-[var(--roam-ink)] bg-[var(--roam-paper)] p-4 text-center">
      <Text className="font-note text-xl leading-none text-[var(--roam-ink)]">Want more?</Text>
      <Text className="mt-1 text-sm text-[var(--roam-muted)]">Get more from Store.</Text>
      <Button className="mt-3" size="xs" onClick={() => onOpenStore(category)}>
        Open Store
      </Button>
    </Box>
  );
}

function RemindersTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [prefs, setPrefs] = useState(readReminderPrefs);
  const [ownedItems, setOwnedItems] = useState<OwnedReminderItems>(readOwnedReminderItems);
  const [reminderTitle, setReminderTitle] = useState('Meeting');
  const [reminderStartsAt, setReminderStartsAt] = useState(() => formatDateTimeLocal(new Date(Date.now() + 30 * 60_000)));
  const [calendarUrl, setCalendarUrl] = useState('');
  const [calendarUrlError, setCalendarUrlError] = useState<string | null>(null);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState(() => Boolean(readGoogleCalendarToken()));
  const [isGoogleCalendarConfigured, setIsGoogleCalendarConfigured] = useState(false);
  const [appearancePanel, setAppearancePanel] = useState<AppearancePanel>('avatar');

  const sendFlightRequest = useCallback((request: ReminderFlightRequest) => {
    localStorage.setItem(REMINDER_FLIGHT_REQUEST_KEY, JSON.stringify(request));
    window.dispatchEvent(new CustomEvent(REMINDER_FLIGHT_REQUEST_KEY, { detail: request }));
  }, []);

  useEffect(() => {
    writeReminderPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    const handleOwnedItemsChanged = (event: Event) => {
      setOwnedItems((event as CustomEvent<OwnedReminderItems>).detail ?? readOwnedReminderItems());
    };

    window.addEventListener(REMINDER_OWNED_ITEMS_CHANGED, handleOwnedItemsChanged);
    return () => window.removeEventListener(REMINDER_OWNED_ITEMS_CHANGED, handleOwnedItemsChanged);
  }, []);

  useEffect(() => {
    const updateGoogleTokenState = () => setHasGoogleToken(Boolean(readGoogleCalendarToken()));

    window.addEventListener(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY, updateGoogleTokenState);
    window.addEventListener('storage', updateGoogleTokenState);
    return () => {
      window.removeEventListener(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY, updateGoogleTokenState);
      window.removeEventListener('storage', updateGoogleTokenState);
    };
  }, []);

  useEffect(() => {
    void isGoogleCalendarDesktopOAuthConfigured().then(setIsGoogleCalendarConfigured);
  }, []);

  const previewMessage = prefs.messageTemplate
    .replaceAll('{title}', 'Meeting')
    .replaceAll('{minutes}', String(prefs.leadMinutes));
  const flightAssets = resolveReminderFlightAssets(createReminderFlightRequest(prefs, previewMessage));
  const { theme, head, color, font } = flightAssets;

  const updatePrefs = useCallback((patch: Partial<ReminderPrefs>) => {
    setPrefs((current) => ({ ...current, ...patch }));
  }, []);

  useEffect(() => {
    setPrefs((current) => {
      const nextPrefs = { ...current };
      let changed = false;

      if (!ownsReminderItem('avatar', nextPrefs.flierHead, ownedItems)) {
        nextPrefs.flierHead = DEFAULT_REMINDER_PREFS.flierHead;
        changed = true;
      }
      if (!ownsReminderItem('plane', nextPrefs.flierColor, ownedItems)) {
        nextPrefs.flierColor = DEFAULT_REMINDER_PREFS.flierColor;
        changed = true;
      }
      if (!ownsReminderItem('banner', nextPrefs.theme, ownedItems)) {
        nextPrefs.theme = DEFAULT_REMINDER_PREFS.theme;
        changed = true;
      }
      if (!ownsReminderItem('text', nextPrefs.font, ownedItems)) {
        nextPrefs.font = DEFAULT_REMINDER_PREFS.font;
        changed = true;
      }
      if (!ownsReminderItem('sound', nextPrefs.soundPack, ownedItems)) {
        nextPrefs.soundPack = DEFAULT_REMINDER_PREFS.soundPack;
        changed = true;
      }

      return changed ? nextPrefs : current;
    });
  }, [ownedItems]);

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
    const normalizedUrl = normalizeCalendarFeedUrl(calendarUrl);

    if (!isValidCalendarFeedUrl(normalizedUrl)) {
      setCalendarUrlError('Paste an HTTPS iCal feed URL.');
      return;
    }

    setPrefs((current) => {
      if (current.calendarLinks.includes(normalizedUrl)) return current;
      return { ...current, calendarLinks: [...current.calendarLinks, normalizedUrl] };
    });
    setCalendarUrl('');
    setCalendarUrlError(null);
  }, [calendarUrl]);

  const removeCalendarLink = useCallback((link: string) => {
    setPrefs((current) => ({
      ...current,
      calendarLinks: current.calendarLinks.filter((calendarLink) => calendarLink !== link),
    }));
  }, []);

  const connectGoogleCalendar = useCallback(async () => {
    setGoogleAuthError(null);

    try {
      await requestGoogleCalendarToken();
      setHasGoogleToken(true);
      setPrefs((current) => ({ ...current, googleCalendarConnected: true }));
    } catch (error) {
      setGoogleAuthError(getErrorMessage(error, 'Google sign-in was not completed.'));
    }
  }, []);

  const disconnectGoogleCalendar = useCallback(async () => {
    await revokeGoogleCalendarToken();
    setHasGoogleToken(false);
    setPrefs((current) => ({ ...current, googleCalendarConnected: false }));
    setGoogleAuthError(null);
  }, []);

  const testFlight = useCallback(() => {
    const request = createReminderFlightRequest(prefs, REMINDER_TEST_MESSAGE);
    playTestSound(request);
    sendFlightRequest(request);
  }, [prefs, sendFlightRequest]);
  const openStore = useCallback((category: AppearancePanel) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('tab', SettingsTabId.PetStore.toString());
    nextSearchParams.set('storeCategory', category);
    setSearchParams(nextSearchParams);
  }, [searchParams, setSearchParams]);
  const ownedHeads = FLIER_HEADS.filter((item) => ownsReminderItem('avatar', item.id, ownedItems));
  const ownedColors = FLIER_COLORS.filter((item) => ownsReminderItem('plane', item.id, ownedItems));
  const ownedThemes = BANNER_THEMES.filter((item) => ownsReminderItem('banner', item.id, ownedItems));
  const ownedFonts = FONT_OPTIONS.filter((item) => ownsReminderItem('text', item.id, ownedItems));
  const ownedSounds = SOUND_OPTIONS.filter((item) => ownsReminderItem('sound', item.id, ownedItems));

  return (
    <Box className="flex flex-col gap-5">
      <Box className="grid grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] gap-5 max-[1040px]:grid-cols-1">
        <Box className="flex flex-col gap-5">
          <SectionCard
            title="Timing"
            description="Choose when reminder flights appear and what the banner says."
          >
            <Box>
              <Text className="font-note text-lg leading-none text-[var(--roam-ink)]">Lead time</Text>
              <Text className="mt-1 text-sm text-[var(--roam-muted)]">Fly this long before a meeting</Text>
              <Box className="mt-3 grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1">
                {LEAD_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className={`reminder-choice reminder-choice-large ${prefs.leadMinutes === minutes ? 'reminder-choice-selected' : ''}`}
                    onClick={() => updatePrefs({ leadMinutes: minutes })}
                  >
                    <span>{minutes} min</span>
                  </button>
                ))}
              </Box>
            </Box>

            <Box className="reminder-dashed-separator" />

            <Box className="flex items-center justify-between gap-5 max-[720px]:items-start">
              <Box>
                <Text className="font-note text-lg leading-none text-[var(--roam-ink)]">Fly again at meeting time</Text>
                <Text className="mt-1 text-sm text-[var(--roam-muted)]">A second fly-by right when it starts</Text>
              </Box>
              <Switch
                checked={prefs.flyAtStart}
                onChange={(event) => updatePrefs({ flyAtStart: event.currentTarget.checked })}
              />
            </Box>

            <Box className="reminder-dashed-separator" />

            <Box>
              <Text className="font-note text-lg leading-none text-[var(--roam-ink)]">Banner message</Text>
              <Text className="mt-1 text-sm text-[var(--roam-muted)]">Tap a tag to insert it</Text>
              <TextInput
                className="mt-3 max-w-[620px]"
                value={prefs.messageTemplate}
                onChange={(event) => updatePrefs({ messageTemplate: event.currentTarget.value })}
              />
              <Group gap="xs" mt="xs">
                {[
                  ['title', '{title}'],
                  ['minutes', '{minutes}'],
                ].map(([label, token]) => (
                  <button
                    key={token}
                    type="button"
                    className="reminder-token-button"
                    onClick={() => updatePrefs({ messageTemplate: `${prefs.messageTemplate}${token}` })}
                  >
                    {label}
                  </button>
                ))}
              </Group>
            </Box>
          </SectionCard>

          <SectionCard
            title="Saved reminders"
            description="Create local fly-by reminders, connect Google Calendar, or add calendar feeds."
          >
            <Box>
              <Box className="flex items-start justify-between gap-4 max-[760px]:flex-col">
                <Box>
                  <Text className="font-note text-lg leading-none text-[var(--roam-ink)]">Google Calendar</Text>
                  <Text className="mt-1 text-sm text-[var(--roam-muted)]">
                    Sign in to read upcoming events from your primary Google Calendar.
                  </Text>
                  {googleAuthError && <Text className="mt-2 text-sm text-[var(--roam-muted)]">{googleAuthError}</Text>}
                  {!isGoogleCalendarConfigured && (
                    <Text className="mt-2 text-sm text-[var(--roam-muted)]">
                      Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET to enable desktop Google sign-in.
                    </Text>
                  )}
                </Box>
                <Group gap="xs">
                  {prefs.googleCalendarConnected && hasGoogleToken ? (
                    <Button leftSection={<IconLogout size={16} />} onClick={disconnectGoogleCalendar}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      disabled={!isGoogleCalendarConfigured}
                      leftSection={<IconBrandGoogle size={16} />}
                      onClick={connectGoogleCalendar}
                    >
                      Sign in
                    </Button>
                  )}
                </Group>
              </Box>
            </Box>

            <Box className="reminder-dashed-separator" />

            <Box>
              <Box>
                <Text className="font-note text-lg leading-none text-[var(--roam-ink)]">Calendar feeds</Text>
                <Text className="mt-1 text-sm text-[var(--roam-muted)]">
                  Add any iCal feed URL from Google, Apple, Outlook, or another calendar provider.
                </Text>
              </Box>
              <Box className="mt-4 grid grid-cols-[1fr_auto] gap-3 max-[860px]:grid-cols-1">
                <TextInput
                  label="iCal feed URL"
                  placeholder="https://example.com/calendar.ics"
                  value={calendarUrl}
                  error={calendarUrlError}
                  onChange={(event) => {
                    setCalendarUrl(event.currentTarget.value);
                    setCalendarUrlError(null);
                  }}
                />
                <Button className="self-end max-[860px]:self-auto" leftSection={<IconLink size={16} />} onClick={addCalendarLink}>
                  Add feed
                </Button>
              </Box>

              <Box className="mt-3 flex flex-col gap-2">
                {prefs.calendarLinks.length === 0 ? (
                  <Text className="text-sm text-[var(--roam-muted)]">No calendar feeds connected.</Text>
                ) : (
                  prefs.calendarLinks.map((link) => (
                    <Box
                      key={link}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[var(--roam-wobble-a)] border-2 border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] px-3 py-2"
                    >
                      <IconCalendarPlus size={18} />
                      <Text className="truncate text-sm text-[var(--roam-muted)]">{link}</Text>
                      <ActionIcon variant="light" aria-label="Remove calendar feed" onClick={() => removeCalendarLink(link)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Box>
                  ))
                )}
              </Box>
            </Box>

            <Box className="reminder-dashed-separator" />

            <Box className="mt-4 grid grid-cols-[1fr_190px_auto] gap-3 max-[860px]:grid-cols-1">
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
          </SectionCard>

          <SectionCard
            title="Flight delivery"
            description="Tune how the reminder crosses the screen."
          >
            <Box className="flex flex-col gap-4">
              <Box>
                <Box className="mb-2 flex items-baseline justify-between gap-3">
                  <Text className="font-note text-lg">Speed</Text>
                  <Text className="text-xs text-[var(--roam-muted)]">How fast the plane crosses the screen</Text>
                </Box>
                <Box className="grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1">
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed.value}
                      type="button"
                      className={`reminder-choice ${prefs.speed === speed.value ? 'reminder-choice-selected' : ''}`}
                      onClick={() => updatePrefs({ speed: speed.value })}
                    >
                      <span>{speed.label}</span>
                      <small>{speed.description}</small>
                    </button>
                  ))}
                </Box>
              </Box>
            </Box>
          </SectionCard>
        </Box>

        <Box className="flex flex-col gap-5">
          <section className="overflow-hidden rounded-[var(--roam-wobble-a)] border-[2.5px] border-solid border-[var(--roam-ink)] bg-[var(--roam-card)] shadow-[var(--roam-shadow)]">
            <Box className="reminder-preview">
              <BannerWaveFilter />
              <Box
                className="reminder-preview-rig"
                style={{
                  '--reminder-stripe-a': theme.a,
                  '--reminder-stripe-b': theme.b,
                  '--reminder-banner-text': theme.text,
                  '--reminder-banner-font': font.stack,
                  ...getReminderBannerSizeStyle(prefs.bannerSize, 'preview', previewMessage),
                } as CSSProperties}
              >
                <ReminderBanner
                  className="reminder-banner"
                  message={previewMessage}
                  layoutKey={`${prefs.bannerSize}:${previewMessage}:${font.id}`}
                />
                <Box className="reminder-rope" />
                <Box className="reminder-flier">
                  <img key={color.id} className="reminder-plane-body" src={color.base} alt="" />
                  <img key={head.id} className="reminder-head" src={head.image} alt="" />
                  <img className="reminder-blade" src={REMINDER_BLADE_URL} alt="" />
                </Box>
              </Box>
            </Box>
            <Box className="p-5">
              <Box className="flex items-start justify-between gap-4 max-[720px]:flex-col">
                <Box>
                  <Text className="mb-3 font-note text-[24px] text-[var(--roam-ink)]">Live preview</Text>
                  <Box className="flex flex-wrap gap-x-5 gap-y-1 text-xs uppercase tracking-[0.08em] text-[var(--roam-muted)]">
                    <span>{theme.name}</span>
                    <span>{SOUND_OPTIONS.find((sound) => sound.id === prefs.soundPack)?.name ?? 'Sound'}</span>
                  </Box>
                </Box>
                <Button className="reminder-test-button" leftSection={<IconPlayerPlay size={18} />} onClick={testFlight}>
                  Preview flight
                </Button>
              </Box>
            </Box>
          </section>

          <SectionCard
            title="Reminder style"
            description="Avatar, plane, banner, text, and sound are separated so each choice is easier to find."
          >
            <Box className="reminder-subnav" role="tablist" aria-label="Reminder style sections">
              {[
                ['avatar', 'Avatar'],
                ['plane', 'Plane'],
                ['banner', 'Banner'],
                ['text', 'Text'],
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

            {appearancePanel === 'avatar' && (
              <>
                <Text className="mt-4 font-note text-lg">Avatar</Text>
                <Box className="mt-2 grid grid-cols-3 gap-3 max-[720px]:grid-cols-2">
                  {ownedHeads.map((item) => {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`reminder-swatch reminder-swatch-large ${prefs.flierHead === item.id ? 'reminder-swatch-selected' : ''}`}
                        onClick={() => {
                          updatePrefs({ flierHead: item.id });
                        }}
                      >
                        <span className="reminder-swatch-art">
                          {item.thumb ? <img src={item.thumb} alt="" /> : <span className="reminder-missing-art">{item.name.slice(0, 1)}</span>}
                        </span>
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </Box>
                <StorePrompt category="avatar" onOpenStore={openStore} />
              </>
            )}

            {appearancePanel === 'plane' && (
              <>
                <Text className="mt-4 font-note text-lg">Plane color</Text>
                <Box className="mt-2 grid grid-cols-3 gap-3 max-[720px]:grid-cols-2">
                  {ownedColors.map((item) => {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`reminder-swatch reminder-swatch-large ${prefs.flierColor === item.id ? 'reminder-swatch-selected' : ''}`}
                        onClick={() => updatePrefs({ flierColor: item.id })}
                      >
                        <span className="reminder-swatch-art reminder-plane-thumb">
                          {item.plane ? <img src={item.plane} alt="" /> : <span className="reminder-missing-art">{item.name.slice(0, 1)}</span>}
                        </span>
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </Box>
                <StorePrompt category="plane" onOpenStore={openStore} />
              </>
            )}

            {appearancePanel === 'banner' && (
              <>
                <Box className="mt-4 grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                  {ownedThemes.map((item) => {
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
                <StorePrompt category="banner" onOpenStore={openStore} />
              </>
            )}

            {appearancePanel === 'text' && (
              <>
                <Box className="mt-4 grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                  {ownedFonts.map((item) => (
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
                <StorePrompt category="text" onOpenStore={openStore} />
              </>
            )}

            {appearancePanel === 'sound' && (
              <>
                <Box className="mt-4 grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
                  {ownedSounds.map((item) => {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`reminder-swatch ${prefs.soundPack === item.id ? 'reminder-swatch-selected' : ''}`}
                        onClick={() => {
                          updatePrefs({ soundPack: item.id });
                          playSoundPreview(item.url);
                        }}
                      >
                        <IconVolume size={24} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </Box>
                <StorePrompt category="sound" onOpenStore={openStore} />
              </>
            )}
          </SectionCard>
        </Box>
      </Box>
    </Box>
  );
}

export default memo(RemindersTab);
