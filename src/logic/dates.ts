export type DateKey = string; // 'YYYY-MM-DD' in the user's local time

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// All arithmetic goes through UTC midnight so DST shifts never add or drop a day.
function toUtcMs(key: DateKey): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): DateKey {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key: DateKey, n: number): DateKey {
  return fromUtcMs(toUtcMs(key) + n * DAY_MS);
}

/** Number of days from a to b (b − a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(key: DateKey): number {
  return new Date(toUtcMs(key)).getUTCDay();
}

/** The Monday of the week containing `key`. */
export function weekStart(key: DateKey): DateKey {
  return addDays(key, -((weekday(key) + 6) % 7));
}

export function isDateKey(v: unknown): v is DateKey {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && fromUtcMs(toUtcMs(v)) === v;
}
