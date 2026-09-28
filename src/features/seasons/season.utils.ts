export interface DurationParts {
  totalMilliseconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const EMPTY_DURATION: DurationParts = { totalMilliseconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function splitDuration(milliseconds: number): DurationParts {
  const safe = Math.max(0, milliseconds);
  return {
    totalMilliseconds: safe,
    days: Math.floor(safe / 86_400_000),
    hours: Math.floor((safe % 86_400_000) / 3_600_000),
    minutes: Math.floor((safe % 3_600_000) / 60_000),
    seconds: Math.floor((safe % 60_000) / 1_000),
  };
}

export function getTimeUntil(value: string | null | undefined, now = Date.now()): DurationParts {
  const target = parseTime(value);
  return target === null ? EMPTY_DURATION : splitDuration(target - now);
}

export function getTimeSince(value: string | null | undefined, now = Date.now()): DurationParts {
  const start = parseTime(value);
  return start === null ? EMPTY_DURATION : splitDuration(now - start);
}

export function getSeasonProgress(startValue: string | null | undefined, endValue: string | null | undefined, now = Date.now()): number | null {
  const start = parseTime(startValue);
  const end = parseTime(endValue);
  if (start === null || end === null || end <= start) return null;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export function formatCalendarDate(value: string | null | undefined, locale?: string): string | null {
  const timestamp = parseTime(value);
  if (timestamp === null) return null;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(timestamp);
}

export function formatRelativeDuration(duration: DurationParts): string {
  if (duration.days > 0) return `${duration.days} ${duration.days === 1 ? "day" : "days"}`;
  if (duration.hours > 0) return `${duration.hours} ${duration.hours === 1 ? "hour" : "hours"}`;
  if (duration.minutes > 0) return `${duration.minutes} ${duration.minutes === 1 ? "minute" : "minutes"}`;
  return `${duration.seconds} ${duration.seconds === 1 ? "second" : "seconds"}`;
}
