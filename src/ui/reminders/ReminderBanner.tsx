import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { fitReminderBannerText } from './fitReminderBannerText';

interface ReminderBannerProps {
  message: string;
  className: 'reminder-banner' | 'reminder-flight-banner';
  /** Bust layout cache when banner CSS variables or font change. */
  layoutKey?: string;
}

function ReminderBanner({ message, className, layoutKey }: ReminderBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const fit = useCallback(() => {
    const banner = bannerRef.current;
    const text = textRef.current;
    if (!banner || !text) return;
    fitReminderBannerText(banner, text);
  }, []);

  useLayoutEffect(() => {
    fit();
  }, [message, layoutKey, fit]);

  useEffect(() => {
    const banner = bannerRef.current;
    if (!banner || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => fit());
    observer.observe(banner);

    return () => observer.disconnect();
  }, [fit]);

  return (
    <div ref={bannerRef} className={className}>
      <span ref={textRef}>{message}</span>
    </div>
  );
}

export default memo(ReminderBanner);
