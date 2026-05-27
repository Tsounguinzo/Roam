function parsePx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readPreferredFontSize(banner: HTMLElement): number {
  const computed = getComputedStyle(banner);
  const fromVar = parsePx(computed.getPropertyValue('--reminder-banner-font-size'));
  if (fromVar > 0) return fromVar;

  const span = banner.querySelector('span');
  if (span) {
    const spanSize = parsePx(getComputedStyle(span).fontSize);
    if (spanSize > 0) return spanSize;
  }

  return 30;
}

/** Sizes banner width to message length (within CSS min/max) and shrinks text so it never overflows. */
export function fitReminderBannerText(banner: HTMLElement, text: HTMLElement): void {
  const computed = getComputedStyle(banner);
  const paddingX = parsePx(computed.paddingLeft) + parsePx(computed.paddingRight);
  const minWidth = parsePx(computed.minWidth);
  const maxWidth = parsePx(computed.maxWidth);
  const preferredFontSize = readPreferredFontSize(banner);
  const minFontSize = Math.max(10, Math.round(preferredFontSize * 0.45));

  text.style.maxWidth = '';
  text.style.width = '';
  text.style.fontSize = `${preferredFontSize}px`;
  banner.style.width = '';

  let fontSize = preferredFontSize;
  text.style.fontSize = `${fontSize}px`;

  const innerLimit = Math.max(0, maxWidth - paddingX);
  let textWidth = text.scrollWidth;

  while (fontSize > minFontSize && textWidth > innerLimit) {
    fontSize -= 1;
    text.style.fontSize = `${fontSize}px`;
    textWidth = text.scrollWidth;
  }

  const innerWidth = Math.min(textWidth, innerLimit);
  const bannerWidth = Math.min(maxWidth, Math.max(minWidth, innerWidth + paddingX));

  banner.style.width = `${bannerWidth}px`;
  text.style.maxWidth = `${Math.max(0, bannerWidth - paddingX)}px`;
}
