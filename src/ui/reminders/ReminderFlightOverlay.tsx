import { listen } from '@tauri-apps/api/event';
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { EventType } from '../../types/IEvents';
import { isTauriRuntime } from '../../utils/runtime';
import {
  GOOGLE_CALENDAR_TOKEN_STORAGE_KEY,
  fetchCalendarReminders,
  fetchGoogleCalendarReminders,
  readGoogleCalendarToken,
} from '../settings/tabs/reminders/calendar';
import { DEFAULT_REMINDER_PREFS, getReminderBannerSizeStyle, readReminderPrefs, REMINDERS_STORAGE_KEY, type FlightReminder, type ReminderBannerSize, type ReminderPrefs } from '../settings/tabs/reminders/options';
import {
  REMINDER_BLADE_URL,
  REMINDER_FLIGHT_REQUEST_KEY,
  createReminderFlightRequest,
  normalizeReminderFlightRequest,
  resolveReminderFlightAssets,
  type ReminderFlightRequest,
} from './flight';
import ReminderBanner from './ReminderBanner';

interface ActiveReminderFlight {
  request: ReminderFlightRequest;
  lane: number;
  startDelayMs: number;
}

const FLIGHT_LANES = [12, 28, 44, 60, 76];
const FLIGHT_STAGGER_MS = 260;

const readPrefs = (): ReminderPrefs => {
  try {
    return readReminderPrefs();
  } catch {
    return DEFAULT_REMINDER_PREFS;
  }
};

function startEngine(ctx: AudioContext, durationSeconds: number) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.8);
  master.gain.setValueAtTime(0.16, Math.max(now + 0.8, now + durationSeconds - 0.8));
  master.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(-0.9, now);
  panner.pan.linearRampToValueAtTime(0.9, now + durationSeconds);
  master.connect(panner).connect(ctx.destination);

  const lowPass = ctx.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.value = 850;

  const wobble = ctx.createGain();
  wobble.gain.value = 1;
  lowPass.connect(wobble).connect(master);

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 11;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.07;
  lfo.connect(lfoGain).connect(wobble.gain);

  const firstOscillator = ctx.createOscillator();
  firstOscillator.type = 'sawtooth';
  firstOscillator.frequency.value = 92;
  const secondOscillator = ctx.createOscillator();
  secondOscillator.type = 'sawtooth';
  secondOscillator.frequency.value = 92 * 1.012;
  firstOscillator.connect(lowPass);
  secondOscillator.connect(lowPass);

  const stopAt = now + durationSeconds + 0.05;
  firstOscillator.start(now);
  secondOscillator.start(now);
  lfo.start(now);
  firstOscillator.stop(stopAt);
  secondOscillator.stop(stopAt);
  lfo.stop(stopAt);
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

function ReminderFlightOverlay() {
  const [flights, setFlights] = useState<ActiveReminderFlight[]>([]);
  const [prefs, setPrefs] = useState(readPrefs);
  const [calendarReminders, setCalendarReminders] = useState<FlightReminder[]>([]);
  const clearTimerRefs = useRef<Map<string, number>>(new Map());
  const nextLaneRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const firedReminderKeysRef = useRef<Set<string>>(new Set());

  const playSound = useCallback((request: ReminderFlightRequest) => {
    const { sound } = resolveReminderFlightAssets(request);
    if (!request.soundEnabled || !sound.url) return;

    try {
      const AudioContextConstructor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextConstructor();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') void ctx.resume();

      const durationSeconds = Math.max(2, request.durationMs / 1000);
      const start = ctx.currentTime;
      startEngine(ctx, durationSeconds);
      void fetch(sound.url)
        .then((response) => response.arrayBuffer())
        .then((buffer) => ctx.decodeAudioData(buffer))
        .then((decoded) => {
          const source = ctx.createBufferSource();
          const gain = ctx.createGain();
          source.buffer = decoded;
          gain.gain.value = 0.9;
          source.connect(gain).connect(ctx.destination);
          source.start(Math.max(start + durationSeconds / 2, ctx.currentTime));
        })
        .catch(() => undefined);
    } catch {
      /* visual flight should still run if audio is blocked */
    }
  }, []);

  const startFlight = useCallback((value: Partial<ReminderFlightRequest>) => {
    const request = normalizeReminderFlightRequest(value);
    const lane = nextLaneRef.current % FLIGHT_LANES.length;
    const startDelayMs = Math.floor(nextLaneRef.current / FLIGHT_LANES.length) * FLIGHT_STAGGER_MS;
    nextLaneRef.current += 1;

    setFlights((current) => [...current, { request, lane, startDelayMs }]);
    window.setTimeout(() => playSound(request), startDelayMs);

    const clearTimer = window.setTimeout(() => {
      setFlights((current) => current.filter((flight) => flight.request.id !== request.id));
      clearTimerRefs.current.delete(request.id);
      if (clearTimerRefs.current.size === 0) nextLaneRef.current = 0;
    }, request.durationMs + startDelayMs + 300);

    clearTimerRefs.current.set(request.id, clearTimer);
  }, [playSound]);

  useEffect(() => {
    const reminders = [...prefs.reminders, ...calendarReminders];
    firedReminderKeysRef.current.forEach((key) => {
      if (!reminders.some((reminder) => key.startsWith(`${reminder.id}:`))) {
        firedReminderKeysRef.current.delete(key);
      }
    });

    const timers = reminders
      .filter((reminder) => reminder.enabled)
      .flatMap((reminder) => {
        const startsAt = new Date(reminder.startsAt).getTime();
        if (Number.isNaN(startsAt)) return [];

        const now = Date.now();
        const leadAt = startsAt - reminder.leadMinutes * 60_000;
        const leadDelay = leadAt - now;
        const leadReminderKey = `${reminder.id}:lead:${reminder.startsAt}:${reminder.leadMinutes}`;
        const reminderTimers: Array<number | undefined> = [
          leadDelay > 0 && leadDelay <= 2_147_483_647
            ? window.setTimeout(() => {
              firedReminderKeysRef.current.add(leadReminderKey);
              const minutes = Math.max(1, Math.round((startsAt - Date.now()) / 60_000));
              const message = prefs.messageTemplate
                .replaceAll('{title}', reminder.title)
                .replaceAll('{minutes}', String(minutes));

              startFlight(createReminderFlightRequest(prefs, message));
            }, leadDelay)
            : undefined,
        ];

        if (leadDelay <= 0 && startsAt > now && !firedReminderKeysRef.current.has(leadReminderKey)) {
          firedReminderKeysRef.current.add(leadReminderKey);
          const minutes = Math.max(1, Math.round((startsAt - now) / 60_000));
          const message = prefs.messageTemplate
            .replaceAll('{title}', reminder.title)
            .replaceAll('{minutes}', String(minutes));

          window.requestAnimationFrame(() => startFlight(createReminderFlightRequest(prefs, message)));
        }

        if (prefs.flyAtStart) {
          const startDelay = startsAt - now;
          const startReminderKey = `${reminder.id}:start:${reminder.startsAt}`;
          reminderTimers.push(
            startDelay > 0 && startDelay <= 2_147_483_647
              ? window.setTimeout(() => {
                firedReminderKeysRef.current.add(startReminderKey);
                startFlight(createReminderFlightRequest(prefs, `${reminder.title} starting now`));
              }, startDelay)
              : undefined,
          );
        }

        return reminderTimers;
      });

    return () => timers.forEach((timer) => timer && window.clearTimeout(timer));
  }, [calendarReminders, prefs, startFlight]);

  useEffect(() => {
    let cancelled = false;

    const refreshCalendarReminders = () => {
      const googleToken = prefs.googleCalendarConnected ? readGoogleCalendarToken() : null;
      if (prefs.calendarLinks.length === 0 && !googleToken) {
        setCalendarReminders([]);
        return;
      }

      void Promise.all([
        fetchCalendarReminders(prefs.calendarLinks, prefs.leadMinutes),
        googleToken ? fetchGoogleCalendarReminders(googleToken.accessToken, prefs.leadMinutes) : Promise.resolve([]),
      ])
        .then(([feedReminders, googleReminders]) => {
          const reminders = [...feedReminders, ...googleReminders];
          if (!cancelled) setCalendarReminders(reminders);
        })
        .catch(() => {
          if (!cancelled) setCalendarReminders([]);
        });
    };

    refreshCalendarReminders();
    const interval = window.setInterval(refreshCalendarReminders, 5 * 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [prefs.calendarLinks, prefs.googleCalendarConnected, prefs.leadMinutes]);

  useEffect(() => {
    const onLocalFlight = (event: Event) => {
      startFlight((event as CustomEvent<ReminderFlightRequest>).detail);
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.newValue) return;
      if (event.key === REMINDERS_STORAGE_KEY) {
        setPrefs(readPrefs());
        return;
      }
      if (event.key === GOOGLE_CALENDAR_TOKEN_STORAGE_KEY) {
        setPrefs(readPrefs());
        return;
      }
      if (event.key !== REMINDER_FLIGHT_REQUEST_KEY) return;
      try {
        startFlight(JSON.parse(event.newValue));
      } catch {
        /* ignore malformed requests */
      }
    };
    const onPrefsChanged = () => setPrefs(readPrefs());

    window.addEventListener(REMINDER_FLIGHT_REQUEST_KEY, onLocalFlight);
    window.addEventListener(REMINDERS_STORAGE_KEY, onPrefsChanged);
    window.addEventListener(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY, onPrefsChanged);
    window.addEventListener('storage', onStorage);

    let unlisten: (() => void) | undefined;
    if (isTauriRuntime()) {
      void listen<ReminderFlightRequest>(EventType.ReminderFlight, (event) => {
        startFlight(event.payload);
      }).then((nextUnlisten) => {
        unlisten = nextUnlisten;
      });
    }

    return () => {
      clearTimerRefs.current.forEach((timer) => window.clearTimeout(timer));
      clearTimerRefs.current.clear();
      window.removeEventListener(REMINDER_FLIGHT_REQUEST_KEY, onLocalFlight);
      window.removeEventListener(REMINDERS_STORAGE_KEY, onPrefsChanged);
      window.removeEventListener(GOOGLE_CALENDAR_TOKEN_STORAGE_KEY, onPrefsChanged);
      window.removeEventListener('storage', onStorage);
      unlisten?.();
    };
  }, [startFlight]);

  if (flights.length === 0) return null;

  return (
    <div className="reminder-flight-overlay" aria-hidden="true">
      <BannerWaveFilter />
      {flights.map(({ request, lane, startDelayMs }) => {
        const { theme, head, color, font } = resolveReminderFlightAssets(request);

        return (
          <div
            key={request.id}
            className="reminder-flight-rig"
            style={{
              '--flight-duration': `${Math.max(2, request.durationMs / 1000)}s`,
              '--flight-start-delay': `${startDelayMs}ms`,
              '--flight-top': `${FLIGHT_LANES[lane]}%`,
              '--reminder-stripe-a': theme.a,
              '--reminder-stripe-b': theme.b,
              '--reminder-banner-text': theme.text,
              '--reminder-banner-font': font.stack,
              ...getReminderBannerSizeStyle(
                (request.bannerSize as ReminderBannerSize) ?? DEFAULT_REMINDER_PREFS.bannerSize,
                'flight',
                request.message,
              ),
            } as CSSProperties}
          >
            <ReminderBanner
              className="reminder-flight-banner"
              message={request.message}
              layoutKey={`${request.bannerSize}:${request.message}:${font.id}`}
            />
            <div className="reminder-flight-rope" />
            <div className="reminder-flight-aircraft">
              <img key={color.id} className="reminder-flight-plane" src={color.base} alt="" />
              <img key={head.id} className="reminder-flight-head" src={head.image} alt="" />
              <img className="reminder-flight-blade" src={REMINDER_BLADE_URL} alt="" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(ReminderFlightOverlay);
