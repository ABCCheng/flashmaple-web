import type { Dictionary } from "./i18n";
import { t } from "./i18n";

export function formatRelativeTime(value: string | undefined, dict: Dictionary) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;

  const diffMs = Date.now() - time;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t(dict, "time.justNow");
  if (minutes === 1) return t(dict, "time.minuteAgo");
  if (minutes < 60) return t(dict, "time.minutesAgo", { value: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return t(dict, "time.hourAgo");
  if (hours < 24) return t(dict, "time.hoursAgo", { value: hours });

  const days = Math.floor(hours / 24);
  if (days === 1) return t(dict, "time.dayAgo");
  if (days <= 3) return t(dict, "time.daysAgo", { value: days });

  return t(dict, "time.absolute", {
    value: formatMonthDayTime(time),
  });
}

export function formatMonthDayTime(value: string | number | Date): string {
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  return `${map.month}-${map.day} ${map.hour}:${map.minute}`;
}

/** Formats a UTC timestamp in the app locale and browser's local time zone. */
export function formatTime12Hour(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value;
  return hour && minute && dayPeriod ? `${hour}:${minute} ${dayPeriod}` : value;
}
