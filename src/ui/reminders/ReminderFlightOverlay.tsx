import { listen } from '@tauri-apps/api/event';
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { EventType } from '../../types/IEvents';
import { isTauriRuntime } from '../../utils/runtime';
import { DEFAULT_REMINDER_PREFS, REMINDERS_STORAGE_KEY, type ReminderPrefs } from '../settings/tabs/reminders/options';
import {
  REMINDER_BLADE_URL,
  REMINDER_FLIGHT_REQUEST_KEY,
  createReminderFlightRequest,
  normalizeReminderFlightRequest,
  resolveReminderFlightAssets,
  type ReminderFlightRequest,
} from './flight';

const readPrefs = (): ReminderPrefs => {
  try {
    return {
      ...DEFAULT_REMINDER_PREFS,
      ...JSON.parse(localStorage.getItem(REMINDERS_STORAGE_KEY) ?? 'null'),
    };
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
  const [flight, setFlight] = useState<ReminderFlightRequest | null>(null);
  const [prefs, setPrefs] = useState(readPrefs);
  const clearTimerRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);

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
    window.clearTimeout(clearTimerRef.current);
    setFlight(null);
    window.requestAnimationFrame(() => {
      setFlight(request);
      playSound(request);
      clearTimerRef.current = window.setTimeout(() => setFlight(null), request.durationMs + 300);
    });
  }, [playSound]);

  useEffect(() => {
    const timers = prefs.reminders
      .filter((reminder) => reminder.enabled)
      .flatMap((reminder) => {
        const startsAt = new Date(reminder.startsAt).getTime();
        if (Number.isNaN(startsAt)) return [];

        const leadAt = startsAt - reminder.leadMinutes * 60_000;
        const leadDelay = leadAt - Date.now();
        const reminderTimers: Array<number | undefined> = [
          leadDelay > 0 && leadDelay <= 2_147_483_647
            ? window.setTimeout(() => {
              const minutes = Math.max(1, Math.round((startsAt - Date.now()) / 60_000));
              const message = prefs.messageTemplate
                .replaceAll('{title}', reminder.title)
                .replaceAll('{minutes}', String(minutes));

              startFlight(createReminderFlightRequest(prefs, message));
            }, leadDelay)
            : undefined,
        ];

        if (prefs.flyAtStart) {
          const startDelay = startsAt - Date.now();
          reminderTimers.push(
            startDelay > 0 && startDelay <= 2_147_483_647
              ? window.setTimeout(() => {
                startFlight(createReminderFlightRequest(prefs, `${reminder.title} starting now`));
              }, startDelay)
              : undefined,
          );
        }

        return reminderTimers;
      });

    return () => timers.forEach((timer) => timer && window.clearTimeout(timer));
  }, [prefs, startFlight]);

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
      window.clearTimeout(clearTimerRef.current);
      window.removeEventListener(REMINDER_FLIGHT_REQUEST_KEY, onLocalFlight);
      window.removeEventListener(REMINDERS_STORAGE_KEY, onPrefsChanged);
      window.removeEventListener('storage', onStorage);
      unlisten?.();
    };
  }, [startFlight]);

  if (!flight) return null;

  const { theme, head, color, font } = resolveReminderFlightAssets(flight);

  return (
    <div className="reminder-flight-overlay" aria-hidden="true">
      <BannerWaveFilter />
      <div
        key={flight.id}
        className="reminder-flight-rig"
        style={{
          '--flight-duration': `${Math.max(2, flight.durationMs / 1000)}s`,
          '--reminder-stripe-a': theme.a,
          '--reminder-stripe-b': theme.b,
          '--reminder-banner-text': theme.text,
          '--reminder-banner-font': font.stack,
        } as CSSProperties}
      >
        <div className="reminder-flight-banner"><span>{flight.message}</span></div>
        <div className="reminder-flight-rope" />
        <div className="reminder-flight-aircraft">
          <img key={color.id} className="reminder-flight-plane" src={color.base} alt="" />
          <img key={head.id} className="reminder-flight-head" src={head.image} alt="" />
          <img className="reminder-flight-blade" src={REMINDER_BLADE_URL} alt="" />
        </div>
      </div>
    </div>
  );
}

export default memo(ReminderFlightOverlay);
