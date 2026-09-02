"use client";

import { useEffect, useState } from "react";
import { formatCount, formatDecimal, formatHours, formatRatio } from "@/lib/format";
import type { EmbedAudience, HostAppFilters } from "@/lib/hostFilters";
import { nativeKpiSpec, type NativeKpiFormat } from "@/lib/nativeKpiMetrics";

const EMPTY = "—";
const CLIENT_CONCURRENCY = 2;
let clientInFlight = 0;
const clientWaiters: Array<() => void> = [];

async function withClientSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (clientInFlight >= CLIENT_CONCURRENCY) {
    await new Promise<void>((resolve) => clientWaiters.push(resolve));
  }
  clientInFlight += 1;
  try {
    return await fn();
  } finally {
    clientInFlight -= 1;
    clientWaiters.shift()?.();
  }
}

function formatMetric(value: number, format: NativeKpiFormat): string {
  if (format === "hours") return formatHours(value);
  if (format === "decimal") return formatDecimal(value, 1);
  if (format === "ratio") return formatRatio(value);
  if (format === "delta") return `${value > 0 ? "+" : ""}${formatCount(value)}`;
  return formatCount(value);
}

/** Weeks spanned by the host range, so a governed total can be shown as a rate. */
function rangeWeeks(filters?: HostAppFilters): number | null {
  const from = Date.parse(filters?.dateFrom ?? "");
  const to = Date.parse(filters?.dateTo ?? "");
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  return (to - from) / (7 * 24 * 60 * 60 * 1000);
}

export function NativeKpiValue({
  metricKey,
  audience,
  orgId,
  filters,
  perWeek = false,
}: {
  metricKey: string;
  audience: EmbedAudience;
  orgId?: string;
  filters?: HostAppFilters;
  /**
   * Divide the governed total by the weeks in range and render as a decimal
   * rate. The vs-median copy is unaffected: scaling every org by the same
   * constant leaves the comparison identical.
   */
  perWeek?: boolean;
}) {
  const spec = nativeKpiSpec(metricKey);
  const [text, setText] = useState("…");
  const [vs, setVs] = useState<string | null>(null);

  useEffect(() => {
    if (!spec) {
      setText(EMPTY);
      setVs(null);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    setText("…");
    setVs(null);
    const load = (allowVsRetry: boolean) =>
      withClientSlot(async () => {
        const res = await fetch("/api/analytics/metrics/query", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({ audience, orgId, metricKey, filters }),
        });
        return { res, data: (await res.json()) as { value?: unknown; vs?: unknown } };
      })
        .then(({ res, data }) => {
          if (cancelled) return;
          if (!res.ok || typeof data.value !== "number" || !Number.isFinite(data.value)) {
            setText(EMPTY);
            setVs(null);
            return;
          }
          const raw = data.value;
          const weeks = perWeek ? rangeWeeks(filters) : null;
          if (perWeek && weeks == null) {
            setText(EMPTY);
            setVs(null);
            return;
          }
          setText(weeks == null ? formatMetric(raw, spec.format) : formatMetric(raw / weeks, "decimal"));
          const nextVs = typeof data.vs === "string" && data.vs.trim() ? data.vs : null;
          setVs(nextVs);
          if (!nextVs && allowVsRetry) {
            window.setTimeout(() => {
              if (!cancelled) void load(false);
            }, 20_000);
          }
        })
        .catch((err: unknown) => {
          if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
          setText(EMPTY);
          setVs(null);
        });

    void load(true);
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [audience, orgId, metricKey, spec, perWeek, filters?.dateFrom, filters?.dateTo, filters?.extra?.org_id]);

  return (
    <>
      <dd>{text}</dd>
      {vs ? <p className="metric-vs">{vs}</p> : null}
    </>
  );
}
