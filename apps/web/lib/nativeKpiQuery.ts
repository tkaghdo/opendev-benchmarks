import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { LAUNCH_ORGS } from "@opendev/catalog";
import { embedConfig } from "@/lib/embedConfig";
import { vsMedianCopy } from "@/lib/format";
import {
  nativeKpiSpec,
  type NativeKpiFilter,
  type NativeKpiMetricSpec,
  type NativeKpiFilteredShare,
  type NativeKpiPreferred,
  type NativeKpiTopShare,
} from "@/lib/nativeKpiMetrics";
import type { HostAppFilters } from "@/lib/hostFilters";

type CubeQuery = {
  measures?: string[];
  dimensions?: string[];
  filters?: NativeKpiFilter[];
  timeDimensions?: Array<{ dimension: string; dateRange: string[] }>;
  order?: Record<string, "asc" | "desc">;
  limit?: number;
  offset?: number;
};

/**
 * Every Cube query costs two AWS SSM round trips (~8-20s), so page count is the
 * only thing that matters. SSM inline stdout caps at ~24KB; a two-field row is
 * ~90 bytes, so 200 rows stays under it.
 */
const PAGE_SIZE = 200;
/** Past this, row-dumping cannot finish before the user gives up. */
const MAX_PAGES = 2;

function dateRange(filters?: HostAppFilters, timeDimension?: string): CubeQuery["timeDimensions"] {
  if (!timeDimension || !filters?.dateFrom || !filters?.dateTo) return undefined;
  return [{ dimension: timeDimension, dateRange: [filters.dateFrom, filters.dateTo] }];
}

export function numericMeasureValue(data: unknown, measure?: string): number | null {
  const rows = asRows(data);
  if (!rows?.length || rows[0] == null || typeof rows[0] !== "object") return null;
  const row = rows[0] as Record<string, unknown>;
  const short = measure?.split(".").pop();
  const raw =
    (measure && row[measure]) ??
    (short && short in row ? row[short] : undefined) ??
    Object.values(row).find(
      (value) =>
        typeof value === "number" ||
        (typeof value === "string" && value !== "" && Number.isFinite(Number(value))),
    );
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function asRows(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: unknown[] }).data;
  }
  return null;
}

function hoursBetween(start: unknown, end: unknown): number | null {
  const a = Date.parse(String(start ?? ""));
  const b = Date.parse(String(end ?? ""));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return (b - a) / 3_600_000;
}

function percentileCont(values: number[], p = 0.5): number | null {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const idx = (xs.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return xs[lo];
  return xs[lo] + (xs[hi] - xs[lo]) * (idx - lo);
}

function pickField(row: Record<string, unknown>, member: string): unknown {
  if (member in row) return row[member];
  const short = member.split(".").pop();
  if (short && short in row) return row[short];
  return undefined;
}

const CUBE_CONCURRENCY = 2;
const cubePriority = new AsyncLocalStorage<"fg" | "bg">();
let cubeInFlight = 0;
const cubeWaiters: Array<{ fg: boolean; resolve: () => void }> = [];
let activeRangeKey = "";

function rangeKey(filters?: HostAppFilters): string {
  return `${filters?.dateFrom ?? ""}|${filters?.dateTo ?? ""}`;
}

function wakeCubeWaiters() {
  while (cubeWaiters.length > 0 && cubeInFlight < CUBE_CONCURRENCY) {
    const fgIdx = cubeWaiters.findIndex((waiter) => waiter.fg);
    const next = cubeWaiters.splice(fgIdx >= 0 ? fgIdx : 0, 1)[0];
    cubeInFlight += 1;
    next.resolve();
  }
}

async function withCubeSlot<T>(fn: () => Promise<T>): Promise<T> {
  const fg = cubePriority.getStore() !== "bg";
  if (cubeInFlight >= CUBE_CONCURRENCY || (!fg && cubeWaiters.some((waiter) => waiter.fg))) {
    await new Promise<void>((resolve) => {
      cubeWaiters.push({ fg, resolve });
    });
  } else {
    cubeInFlight += 1;
  }
  try {
    return await fn();
  } finally {
    cubeInFlight -= 1;
    wakeCubeWaiters();
  }
}

function isRetryableCubeError(error: string, code?: string): boolean {
  const text = `${code ?? ""} ${error}`.toLowerCase();
  return text.includes("rate exceeded") || text.includes("not ready") || text.includes("cube_load_failed");
}

async function cubeLoadOnce(query: CubeQuery, customerId: string) {
  const { apiUrl, embedApiKey } = embedConfig();
  if (!apiUrl || !embedApiKey) {
    return { ok: false as const, error: "Embedded Canvas is not configured", code: "not_configured" };
  }
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/public/metrics/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${embedApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerId, query }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    const cause = err instanceof Error ? err.message : "fetch failed";
    return { ok: false as const, error: `Could not reach metrics API (${cause})`, code: "upstream_unreachable" };
  }

  const raw = await res.text();
  let data: { data?: unknown; error?: string; code?: string } = {};
  try {
    data = raw ? (JSON.parse(raw) as typeof data) : {};
  } catch {
    return { ok: false as const, error: "Metrics API returned non-JSON", code: "upstream_invalid_json" };
  }
  if (!res.ok) {
    return {
      ok: false as const,
      error: typeof data.error === "string" ? data.error : "Metric query failed",
      code: typeof data.code === "string" ? data.code : undefined,
    };
  }
  return { ok: true as const, data: data.data };
}

async function cubeLoad(query: CubeQuery, customerId: string) {
  return withCubeSlot(async () => {
    const first = await cubeLoadOnce(query, customerId);
    if (first.ok || !isRetryableCubeError(first.error, first.code)) return first;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return cubeLoadOnce(query, customerId);
  });
}

/**
 * Which governed members are published. Read once, so a card can use an
 * aggregate measure as soon as it is deployed without shipping a code change.
 */
const CATALOG_TTL_MS = 5 * 60_000;
let catalogCache: { exp: number; members: Set<string> } | null = null;
let catalogInFlight: Promise<Set<string>> | null = null;

async function publishedMembers(): Promise<Set<string>> {
  if (catalogCache && catalogCache.exp > Date.now()) return catalogCache.members;
  if (catalogInFlight) return catalogInFlight;

  catalogInFlight = (async () => {
    const members = new Set<string>();
    const { apiUrl, embedApiKey } = embedConfig();
    if (apiUrl && embedApiKey) {
      try {
        const res = await fetch(`${apiUrl}/public/metrics/v1/catalog`, {
          headers: { Authorization: `Bearer ${embedApiKey}` },
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const body = (await res.json()) as {
            measures?: unknown[];
            dimensions?: unknown[];
          };
          for (const row of [...(body.measures ?? []), ...(body.dimensions ?? [])]) {
            const key = (row as { memberKey?: unknown })?.memberKey;
            if (typeof key === "string") members.add(key);
          }
        }
      } catch {
        /* fall back to row paging */
      }
    }
    // An empty catalog read is almost certainly a blip; retry sooner than a hit.
    catalogCache = { exp: Date.now() + (members.size ? CATALOG_TTL_MS : 30_000), members };
    catalogInFlight = null;
    return members;
  })();
  return catalogInFlight;
}

async function hasMembers(required: string[]): Promise<boolean> {
  if (required.length === 0) return true;
  const members = await publishedMembers();
  return required.every((member) => members.has(member));
}

async function queryPreferred(
  preferred: NativeKpiPreferred,
  customerId: string,
  filters?: HostAppFilters,
): Promise<{ ok: true; value: number } | { ok: false; error: string; code?: string }> {
  const measures = preferred.divideByMeasure
    ? [preferred.measure, preferred.divideByMeasure]
    : [preferred.measure];
  const loaded = await cubeLoad(
    {
      measures,
      timeDimensions: dateRange(filters, preferred.timeDimension),
    },
    customerId,
  );
  if (!loaded.ok) return loaded;

  const numerator = numericMeasureValue(loaded.data, preferred.measure);
  if (numerator == null) return { ok: false, error: "Metric query returned no numeric value", code: "empty" };
  if (!preferred.divideByMeasure) return { ok: true, value: numerator };

  const denominator = numericMeasureValue(loaded.data, preferred.divideByMeasure);
  if (denominator == null) return { ok: false, error: "Metric query returned no numeric value", code: "empty" };
  if (!denominator) return { ok: false, error: "Denominator was zero", code: "empty" };
  return { ok: true, value: numerator / denominator };
}

/**
 * Concentration without paging every author: let the warehouse rank and cut to
 * the top N, then divide by the ungrouped total.
 */
async function queryTopShare(
  top: NativeKpiTopShare,
  customerId: string,
  filters?: HostAppFilters,
): Promise<{ ok: true; value: number } | { ok: false; error: string; code?: string }> {
  const timeDimensions = dateRange(filters, top.timeDimension);
  const ranked = await cubeLoad(
    {
      measures: [top.measure],
      dimensions: [top.dimension],
      order: { [top.measure]: "desc" },
      limit: top.topN,
      timeDimensions,
    },
    customerId,
  );
  if (!ranked.ok) return ranked;

  let head = 0;
  for (const row of asRows(ranked.data) ?? []) {
    if (!row || typeof row !== "object") continue;
    const n = Number(pickField(row as Record<string, unknown>, top.measure));
    if (Number.isFinite(n)) head += n;
  }

  const totalLoaded = await cubeLoad({ measures: [top.measure], timeDimensions }, customerId);
  if (!totalLoaded.ok) return totalLoaded;
  const total = numericMeasureValue(totalLoaded.data, top.measure);
  if (total == null) return { ok: false, error: "Metric query returned no numeric value", code: "empty" };
  if (!total) return { ok: false, error: "Denominator was zero", code: "empty" };
  return { ok: true, value: head / total };
}

async function queryFilteredShare(
  share: NativeKpiFilteredShare,
  customerId: string,
  filters?: HostAppFilters,
): Promise<{ ok: true; value: number } | { ok: false; error: string; code?: string }> {
  const timeDimensions = dateRange(filters, share.timeDimension);
  const matched = await cubeLoad(
    { measures: [share.measure], filters: share.filters, timeDimensions },
    customerId,
  );
  if (!matched.ok) return matched;
  const part = numericMeasureValue(matched.data, share.measure);
  if (part == null) return { ok: false, error: "Metric query returned no numeric value", code: "empty" };

  const totalLoaded = await cubeLoad({ measures: [share.measure], timeDimensions }, customerId);
  if (!totalLoaded.ok) return totalLoaded;
  const total = numericMeasureValue(totalLoaded.data, share.measure);
  if (total == null) return { ok: false, error: "Metric query returned no numeric value", code: "empty" };
  if (!total) return { ok: false, error: "Denominator was zero", code: "empty" };
  return { ok: true, value: part / total };
}

const TOO_LARGE = {
  ok: false as const,
  error: "Range has more rows than the governed metrics API can page",
  code: "range_too_large",
};

async function loadCappedRows(
  query: CubeQuery,
  customerId: string,
): Promise<{ ok: true; rows: unknown[] } | { ok: false; error: string; code?: string }> {
  const rows: unknown[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const loaded = await cubeLoad({ ...query, limit: PAGE_SIZE, offset: page * PAGE_SIZE }, customerId);
    if (!loaded.ok) return loaded;
    const chunk = asRows(loaded.data) ?? [];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) return { ok: true, rows };
  }
  return TOO_LARGE;
}

async function queryPart(
  spec: Pick<
    NativeKpiMetricSpec,
    "measure" | "timeDimension" | "distinctDimension" | "percentile" | "filters" | "limit"
  >,
  customerId: string,
  filters?: HostAppFilters,
): Promise<{ ok: true; value: number } | { ok: false; error: string; code?: string }> {
  if (spec.percentile) {
    const loaded = await loadCappedRows(
      {
        dimensions: [spec.percentile.start, spec.percentile.end],
        filters: spec.filters,
        timeDimensions: dateRange(filters, spec.timeDimension),
      },
      customerId,
    );
    if (!loaded.ok) return loaded;
    const hours: number[] = [];
    for (const row of loaded.rows) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const h = hoursBetween(pickField(rec, spec.percentile.start), pickField(rec, spec.percentile.end));
      if (h != null && h >= 0) hours.push(h);
    }
    const value = percentileCont(hours);
    if (value == null) return { ok: false, error: "Metric query returned no numeric value", code: "empty" };
    return { ok: true, value };
  }

  if (spec.distinctDimension && !spec.measure) {
    const loaded = await loadCappedRows(
      {
        dimensions: [spec.distinctDimension],
        filters: spec.filters,
        timeDimensions: dateRange(filters, spec.timeDimension),
      },
      customerId,
    );
    if (!loaded.ok) return loaded;
    return { ok: true, value: loaded.rows.length };
  }

  if (spec.measure) {
    const loaded = await cubeLoad(
      {
        measures: [spec.measure],
        filters: spec.filters,
        timeDimensions: dateRange(filters, spec.timeDimension),
      },
      customerId,
    );
    if (!loaded.ok) return loaded;
    const value = numericMeasureValue(loaded.data, spec.measure);
    if (value == null) return { ok: false, error: "Metric query returned no numeric value", code: "empty" };
    return { ok: true, value };
  }

  return { ok: false, error: "Metric is not enabled", code: "not_configured" };
}

const VALUE_CACHE_TTL_MS = 5 * 60_000;
const valueCache = new Map<string, { exp: number; result: { ok: true; value: number } }>();
/** Row counts do not shrink, so never re-page a range we already gave up on. */
const tooLargeCache = new Set<string>();

function valueCacheKey(metricKey: string, customerId: string, filters?: HostAppFilters): string {
  const spec = nativeKpiSpec(metricKey);
  // A difference inherits the range from its operands, so key it by range even
  // though the spec itself names no time dimension.
  const rangeAware = Boolean(
    spec?.preferred?.timeDimension ||
      spec?.timeDimension ||
      spec?.optionalTimeDimension ||
      spec?.topShare?.timeDimension ||
      spec?.filteredShare?.timeDimension ||
      spec?.difference,
  );
  if (!rangeAware) return [metricKey, customerId].join("|");
  return [metricKey, customerId, filters?.dateFrom ?? "", filters?.dateTo ?? ""].join("|");
}

type NativeKpiResult = { ok: true; value: number } | { ok: false; error: string; code?: string };

/**
 * Cards can request the same governed metric concurrently — throughput reuses
 * the merged-PR total — and every cache miss costs an SSM round trip. Sharing
 * the in-flight promise collapses those into one query.
 */
const inFlight = new Map<string, Promise<NativeKpiResult>>();

export async function queryNativeKpiValue(input: {
  metricKey: string;
  customerId: string;
  filters?: HostAppFilters;
}): Promise<NativeKpiResult> {
  if (!nativeKpiSpec(input.metricKey)) {
    return { ok: false, error: "Metric is not enabled", code: "not_configured" };
  }
  const cacheKey = valueCacheKey(input.metricKey, input.customerId, input.filters);
  const cached = valueCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.result;
  if (tooLargeCache.has(cacheKey)) return TOO_LARGE;

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const run = queryNativeKpiValueUncached(input).finally(() => {
    inFlight.delete(cacheKey);
  });
  inFlight.set(cacheKey, run);
  return run;
}

async function queryNativeKpiValueUncached(input: {
  metricKey: string;
  customerId: string;
  filters?: HostAppFilters;
}): Promise<NativeKpiResult> {
  const spec = nativeKpiSpec(input.metricKey);
  if (!spec) return { ok: false, error: "Metric is not enabled", code: "not_configured" };

  const cacheKey = valueCacheKey(input.metricKey, input.customerId, input.filters);
  const cached = valueCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) return cached.result;
  if (tooLargeCache.has(cacheKey)) return TOO_LARGE;

  const remember = (result: { ok: true; value: number }) => {
    valueCache.set(cacheKey, { exp: Date.now() + VALUE_CACHE_TTL_MS, result });
    return result;
  };

  if (spec.difference) {
    const [minuend, subtrahend] = await Promise.all([
      queryNativeKpiValue({
        metricKey: spec.difference.minuend,
        customerId: input.customerId,
        filters: input.filters,
      }),
      queryNativeKpiValue({
        metricKey: spec.difference.subtrahend,
        customerId: input.customerId,
        filters: input.filters,
      }),
    ]);
    if (!minuend.ok) return minuend;
    if (!subtrahend.ok) return subtrahend;
    return remember({ ok: true, value: minuend.value - subtrahend.value });
  }

  if (spec.topShare) {
    const result = await queryTopShare(spec.topShare, input.customerId, input.filters);
    return result.ok ? remember(result) : result;
  }

  if (spec.filteredShare) {
    const result = await queryFilteredShare(spec.filteredShare, input.customerId, input.filters);
    return result.ok ? remember(result) : result;
  }

  if (spec.preferred && (await hasMembers(spec.preferred.requires))) {
    const result = await queryPreferred(spec.preferred, input.customerId, input.filters);
    return result.ok ? remember(result) : result;
  }

  if (spec.optionalTimeDimension && (await hasMembers([spec.optionalTimeDimension]))) {
    const result = await queryPart(
      { ...spec, timeDimension: spec.optionalTimeDimension },
      input.customerId,
      input.filters,
    );
    return result.ok ? remember(result) : result;
  }

  if (spec.divideByDistinct) {
    const num = await queryPart(
      {
        measure: spec.measure,
        timeDimension: spec.timeDimension,
      },
      input.customerId,
      input.filters,
    );
    const den = num.ok
      ? await queryPart(
          {
            distinctDimension: spec.divideByDistinct,
            timeDimension: spec.divideByTimeDimension ?? spec.timeDimension,
            filters: spec.filters,
          },
          input.customerId,
          input.filters,
        )
      : num;
    if (!num.ok) return num;
    if (!den.ok) return den;
    if (!den.value) return { ok: false, error: "Denominator was zero", code: "empty" };
    const ratio = { ok: true as const, value: num.value / den.value };
    valueCache.set(valueCacheKey(input.metricKey, input.customerId, input.filters), {
      exp: Date.now() + VALUE_CACHE_TTL_MS,
      result: ratio,
    });
    return ratio;
  }

  const result = await queryPart(spec, input.customerId, input.filters);
  if (result.ok) {
    valueCache.set(valueCacheKey(input.metricKey, input.customerId, input.filters), {
      exp: Date.now() + VALUE_CACHE_TTL_MS,
      result,
    });
  } else if (result.code === "range_too_large") {
    tooLargeCache.add(valueCacheKey(input.metricKey, input.customerId, input.filters));
  }
  return result;
}

function medianOf(values: number[]): number | null {
  const nums = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
}

function cachedPeerValue(metricKey: string, customerId: string, filters?: HostAppFilters): number | null {
  const cached = valueCache.get(valueCacheKey(metricKey, customerId, filters));
  if (!cached || cached.exp <= Date.now()) return null;
  return cached.result.value;
}

export async function warmLaunchOrgPeers(input: {
  metricKey: string;
  customerId: string;
  filters?: HostAppFilters;
}): Promise<void> {
  const spec = nativeKpiSpec(input.metricKey);
  if (!spec) return;
  // Peers are only affordable when the card is a bounded number of aggregate
  // queries. Row paging would cost 8-20 SSM round trips per org.
  const singleQuery =
    (spec.preferred && (await hasMembers(spec.preferred.requires))) ||
    (!spec.percentile && !spec.distinctDimension && !spec.divideByDistinct);
  if (!singleQuery) return;
  const key = rangeKey(input.filters);
  await cubePriority.run("bg", async () => {
    const others = LAUNCH_ORGS.map((org) => org.id).filter((id) => id !== input.customerId);
    for (const customerId of others) {
      if (activeRangeKey !== key) return;
      if (cachedPeerValue(input.metricKey, customerId, input.filters) != null) continue;
      await queryNativeKpiValue({
        metricKey: input.metricKey,
        customerId,
        filters: input.filters,
      });
    }
  });
}

export async function queryNativeKpiBenchmark(input: {
  metricKey: string;
  customerId: string;
  filters?: HostAppFilters;
}): Promise<
  | { ok: true; value: number; median: number | null; vs: string | null }
  | { ok: false; error: string; code?: string }
> {
  const spec = nativeKpiSpec(input.metricKey);
  if (!spec) return { ok: false, error: "Metric is not enabled", code: "not_configured" };

  activeRangeKey = rangeKey(input.filters);

  const current = await queryNativeKpiValue({
    metricKey: input.metricKey,
    customerId: input.customerId,
    filters: input.filters,
  });
  if (!current.ok) return current;

  const others = LAUNCH_ORGS.map((org) => org.id).filter((id) => id !== input.customerId);
  const peerValues = [
    current.value,
    ...others.flatMap((id) => {
      const value = cachedPeerValue(input.metricKey, id, input.filters);
      return value == null ? [] : [value];
    }),
  ];
  const median = peerValues.length >= 3 ? medianOf(peerValues) : null;
  return {
    ok: true,
    value: current.value,
    median,
    vs: vsMedianCopy(current.value, median, Boolean(spec.lowerIsBetter)),
  };
}
