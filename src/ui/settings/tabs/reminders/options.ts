export type ReminderFlightSpeed = 'normal' | 'fast' | 'ultra';
export type ReminderDisplay = 'cursor' | 'primary';

export interface FlightReminder {
  id: string;
  title: string;
  startsAt: string;
  leadMinutes: number;
  enabled: boolean;
}

export interface ReminderPrefs {
  leadMinutes: number;
  messageTemplate: string;
  soundEnabled: boolean;
  staySignedIn: boolean;
  launchAtLogin: boolean;
  targetDisplay: ReminderDisplay;
  speed: ReminderFlightSpeed;
  flyAtStart: boolean;
  theme: string;
  flierHead: string;
  flierColor: string;
  font: string;
  soundPack: string;
  calendarLinks: string[];
  reminders: FlightReminder[];
}

export const REMINDERS_STORAGE_KEY = 'roam-flight-reminder-preferences';

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  leadMinutes: 5,
  messageTemplate: '{title} in {minutes} minutes',
  soundEnabled: true,
  staySignedIn: true,
  launchAtLogin: false,
  targetDisplay: 'cursor',
  speed: 'normal',
  flyAtStart: false,
  theme: 'classic',
  flierHead: 'duck',
  flierColor: 'red',
  font: 'system',
  soundPack: 'quack',
  calendarLinks: [],
  reminders: [],
};

export const mergeReminderPrefs = (value: Partial<ReminderPrefs> | null): ReminderPrefs => ({
  ...DEFAULT_REMINDER_PREFS,
  ...(value ?? {}),
  calendarLinks: Array.isArray(value?.calendarLinks) ? value.calendarLinks : [],
  reminders: Array.isArray(value?.reminders) ? value.reminders : [],
});

export const readReminderPrefs = (): ReminderPrefs => {
  try {
    return mergeReminderPrefs(JSON.parse(localStorage.getItem(REMINDERS_STORAGE_KEY) ?? 'null'));
  } catch {
    return mergeReminderPrefs(null);
  }
};

export const writeReminderPrefs = (prefs: ReminderPrefs) => {
  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(prefs));
};

export const updateReminderPrefs = (patch: Partial<ReminderPrefs>) => {
  const nextPrefs = {
    ...readReminderPrefs(),
    ...patch,
  };

  writeReminderPrefs(nextPrefs);
  return nextPrefs;
};

export const LEAD_OPTIONS = [5, 15, 30];

export const SPEED_OPTIONS: Array<{ value: ReminderFlightSpeed; label: string; description: string }> = [
  { value: 'normal', label: 'x1', description: 'Easy cruise' },
  { value: 'fast', label: 'x1.5', description: 'Quick pass' },
  { value: 'ultra', label: 'x2', description: 'Blink fast' },
];

export const FLIER_HEADS = [
  { id: 'duck', name: 'Duck', free: true, image: '/reminders/head.png', thumb: '/reminders/thumb-head.png', sound: 'quack' },
  { id: 'corgi', name: 'Corgi', free: true, image: '/reminders/head-corgi.png', thumb: '/reminders/thumb-head-corgi.png', sound: 'dog' },
  { id: 'dino', name: 'Dino', free: true, image: '/reminders/head-dino.png', thumb: '/reminders/thumb-head-dino.png', sound: 'dino' },
  { id: 'pigeon', name: 'Pigeon', free: true, image: '/reminders/head-pigeon.png', thumb: '/reminders/thumb-head-pigeon.png', sound: 'pigeon' },
  { id: 'capybara', name: 'Capybara', free: true, image: '/reminders/head-capybara.png', thumb: '/reminders/thumb-head-capybara.png', sound: 'capy' },
];

export const FLIER_COLORS = [
  { id: 'red', name: 'Red', free: true, plane: '/reminders/thumb-plane.png', base: '/reminders/plane-base.png' },
  { id: 'blue', name: 'Blue', free: true, plane: '/reminders/thumb-plane-blue.png', base: '/reminders/plane-blue-base.png' },
  { id: 'green', name: 'Green', free: true, plane: '/reminders/thumb-plane-green.png', base: '/reminders/plane-green-base.png' },
  { id: 'pink', name: 'Pink', free: true, plane: '/reminders/thumb-plane-pink.png', base: '/reminders/plane-pink-base.png' },
  { id: 'black', name: 'Black', free: true, plane: '/reminders/thumb-plane-black.png', base: '/reminders/plane-black-base.png' },
];

export const BANNER_THEMES = [
  { id: 'classic', name: 'Classic', free: true, a: '#ffffff', b: '#ffe24d', text: '#1a1a1a' },
  { id: 'midnight', name: 'Midnight', free: true, a: '#10233a', b: '#37e0ff', text: '#ffffff' },
  { id: 'sunset', name: 'Sunset', free: true, a: '#ff8a3d', b: '#ffd24d', text: '#3a1500' },
  { id: 'mint', name: 'Mint', free: true, a: '#bff5e0', b: '#16c79a', text: '#06281f' },
  { id: 'bubblegum', name: 'Bubblegum', free: true, a: '#ff8ad1', b: '#9b6bff', text: '#2a0a3a' },
];

export const FONT_OPTIONS = [
  { id: 'system', name: 'System', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" },
  { id: 'rounded', name: 'Rounded', stack: "'SF Pro Rounded', 'Arial Rounded MT Bold', 'Hiragino Maru Gothic ProN', system-ui, sans-serif" },
  { id: 'serif', name: 'Serif', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'mono', name: 'Mono', stack: "'SF Mono', Menlo, Consolas, monospace" },
  { id: 'condensed', name: 'Condensed', stack: "'Arial Narrow', 'Helvetica Neue', sans-serif" },
];

export const SOUND_OPTIONS = [
  { id: 'quack', name: 'Duck', free: true, url: '/reminders/flight.wav' },
  { id: 'dog', name: 'Dog', free: true, url: '/reminders/dog.wav' },
  { id: 'dino', name: 'Dino', free: true, url: '/reminders/dino.wav' },
  { id: 'pigeon', name: 'Pigeon', free: true, url: '/reminders/pigeon.wav' },
  { id: 'capy', name: 'Capybara', free: true, url: '/reminders/capy.wav' },
];

export function getReminderTheme(id: string) {
  return BANNER_THEMES.find((theme) => theme.id === id) ?? BANNER_THEMES[0];
}

export function getReminderHead(id: string) {
  return FLIER_HEADS.find((head) => head.id === id) ?? FLIER_HEADS[0];
}

export function getReminderColor(id: string) {
  return FLIER_COLORS.find((color) => color.id === id) ?? FLIER_COLORS[0];
}

export function getReminderFont(id: string) {
  return FONT_OPTIONS.find((font) => font.id === id) ?? FONT_OPTIONS[0];
}
