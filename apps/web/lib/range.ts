export const RANGE_DAYS = [30, 90, 365] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];

export function parseRange(raw: string | string[] | undefined): RangeDays {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  if (n === 30 || n === 90 || n === 365) return n;
  return 365;
}

export function rangeLabel(days: RangeDays): string {
  return days === 365 ? "12 months" : `${days} days`;
}
