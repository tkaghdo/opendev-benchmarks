import { after, NextResponse } from "next/server";
import { embedReady, getDemoTenantFromCookie, parseAudience, resolveEmbedContext } from "@/lib/embedContext";
import { nativeKpiSpec } from "@/lib/nativeKpiMetrics";
import { queryNativeKpiBenchmark, warmLaunchOrgPeers } from "@/lib/nativeKpiQuery";
import type { HostAppFilters } from "@/lib/hostFilters";

/**
 * BFF proxy for governed metrics. Never expose the embed API key.
 * customerId is resolved server-side (same rules as embed sessions).
 * Also queries the five launch orgs so the green vs-median line is Cube, not warehouse.
 */
export async function POST(req: Request) {
  if (!embedReady()) {
    return NextResponse.json(
      { error: "Embedded Canvas is not configured", code: "not_configured" },
      { status: 501 },
    );
  }

  let body: {
    audience?: unknown;
    orgId?: unknown;
    metricKey?: unknown;
    filters?: HostAppFilters;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const metricKey = typeof body.metricKey === "string" ? body.metricKey : "";
  if (!nativeKpiSpec(metricKey)) {
    return NextResponse.json({ error: "Unknown or disabled metric", code: "not_configured" }, { status: 400 });
  }

  const audience = parseAudience(body.audience);
  const requestedOrgId =
    typeof body.orgId === "string"
      ? body.orgId
      : typeof body.filters?.extra?.org_id === "string"
        ? body.filters.extra.org_id
        : null;

  const resolved = resolveEmbedContext({
    audience,
    cookieOrgId: await getDemoTenantFromCookie(),
    requestedOrgId,
    filters: body.filters,
  });

  const customerId = resolved.customerId;
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required for this audience", code: "tenant_required" }, { status: 400 });
  }

  const result = await queryNativeKpiBenchmark({
    metricKey,
    customerId,
    filters: resolved.filters,
  });

  if (!result.ok) {
    const status = result.code === "not_configured" ? 501 : 502;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  if (result.vs == null) {
    after(() =>
      warmLaunchOrgPeers({
        metricKey,
        customerId,
        filters: resolved.filters,
      }),
    );
  }

  return NextResponse.json({ value: result.value, median: result.median, vs: result.vs });
}
