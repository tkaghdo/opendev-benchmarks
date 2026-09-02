export function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

export function formatHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) < 48) return `${value.toFixed(1)}h`;
  return `${(value / 24).toFixed(1)}d`;
}

export function formatRatio(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDecimal(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function vsMedianCopy(
  value: number | null | undefined,
  median: number | null | undefined,
  lowerIsBetter: boolean,
): string | null {
  if (value == null || median == null || median === 0 || !Number.isFinite(value) || !Number.isFinite(median)) {
    return null;
  }
  const delta = (value - median) / Math.abs(median);
  const pct = Math.abs(delta) * 100;
  if (pct < 0.5) return "In line with the OpenDev median";
  const amount = `${pct.toFixed(0)}%`;
  if (lowerIsBetter) {
    return delta < 0 ? `${amount} faster than the OpenDev median` : `${amount} slower than the OpenDev median`;
  }
  return delta > 0 ? `${amount} above the OpenDev median` : `${amount} below the OpenDev median`;
}
