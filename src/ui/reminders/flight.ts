import { DEFAULT_REMINDER_PREFS, getReminderColor, getReminderFont, getReminderHead, getReminderTheme, SOUND_OPTIONS } from '../settings/tabs/reminders/options';

export const REMINDER_FLIGHT_REQUEST_KEY = 'roam-reminder-flight-request';
export const REMINDER_FLIGHT_DURATION_MS = 9000;
export const REMINDER_TEST_MESSAGE = 'Call with Jack in 5 minutes';
export const REMINDER_BLADE_URL = '/reminders/blade.png';

const SPEED_MULTIPLIERS = {
  normal: 1,
  fast: 1.5,
  ultra: 2,
} as const;

export interface ReminderFlightRequest {
  id: string;
  message: string;
  durationMs: number;
  soundEnabled: boolean;
  theme: string;
  flierHead: string;
  flierColor: string;
  font: string;
  soundPack: string;
}

export function createReminderFlightRequest(prefs = DEFAULT_REMINDER_PREFS, message = REMINDER_TEST_MESSAGE): ReminderFlightRequest {
  const speedMultiplier = SPEED_MULTIPLIERS[prefs.speed] ?? SPEED_MULTIPLIERS.normal;

  return {
    id: crypto.randomUUID(),
    message,
    durationMs: Math.round(REMINDER_FLIGHT_DURATION_MS / speedMultiplier),
    soundEnabled: prefs.soundEnabled,
    theme: prefs.theme,
    flierHead: prefs.flierHead,
    flierColor: prefs.flierColor,
    font: prefs.font,
    soundPack: prefs.soundPack,
  };
}

export function normalizeReminderFlightRequest(value: Partial<ReminderFlightRequest>): ReminderFlightRequest {
  return {
    id: value.id ?? crypto.randomUUID(),
    message: value.message ?? REMINDER_TEST_MESSAGE,
    durationMs: value.durationMs ?? REMINDER_FLIGHT_DURATION_MS,
    soundEnabled: value.soundEnabled ?? DEFAULT_REMINDER_PREFS.soundEnabled,
    theme: value.theme ?? DEFAULT_REMINDER_PREFS.theme,
    flierHead: value.flierHead ?? DEFAULT_REMINDER_PREFS.flierHead,
    flierColor: value.flierColor ?? DEFAULT_REMINDER_PREFS.flierColor,
    font: value.font ?? DEFAULT_REMINDER_PREFS.font,
    soundPack: value.soundPack ?? DEFAULT_REMINDER_PREFS.soundPack,
  };
}

export function resolveReminderFlightAssets(request: ReminderFlightRequest) {
  const theme = getReminderTheme(request.theme);
  const head = getReminderHead(request.flierHead);
  const color = getReminderColor(request.flierColor);
  const font = getReminderFont(request.font);
  const sound = SOUND_OPTIONS.find((item) => item.id === request.soundPack) ?? SOUND_OPTIONS[0];

  return {
    theme,
    head: head.image ? head : getReminderHead(DEFAULT_REMINDER_PREFS.flierHead),
    color: color.base ? color : getReminderColor(DEFAULT_REMINDER_PREFS.flierColor),
    font,
    sound,
  };
}
