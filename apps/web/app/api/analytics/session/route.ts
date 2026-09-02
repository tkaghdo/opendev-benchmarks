import { NextResponse } from "next/server";
import { embedConfig, resolveMintEmbedToken } from "@/lib/embedConfig";
import { embedReady, getDemoTenantFromCookie, parseAudience, resolveEmbedContext } from "@/lib/embedContext";
import { mintEmbedSessionForTenant } from "@/lib/embedSession";
import type { HostAppFilters } from "@/lib/hostFilters";

/**
 * BFF session mint. Never trust client-supplied customerId.
 * Customer audience: HttpOnly cookie only.
 * Internal: skipTenantRls, same dashboard token.
 * Public: org comes from the host page (filters.extra.org_id), not a security boundary.
 */
export async function POST(req: Request) {
  const config = embedConfig();
  if (!embedReady()) {
    return NextResponse.json(
      {
        error: "Embedded Canvas is not configured. Set EMBEDDED_CANVAS_API_URL, EMBED_API_KEY, and EMBED_TOKEN.",
        code: "not_configured",
      },
      { status: 501 },
    );
  }

  let body: {
    audience?: unknown;
    customerId?: unknown;
    orgId?: unknown;
    filters?: HostAppFilters;
    embedToken?: unknown;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const audience = parseAudience(body.audience);
  const cookieOrgId = await getDemoTenantFromCookie();
  const requestedOrgId =
    typeof body.orgId === "string"
      ? body.orgId
      : typeof body.filters?.extra?.org_id === "string"
        ? body.filters.extra.org_id
        : null;

  const resolved = resolveEmbedContext({
    audience,
    cookieOrgId,
    requestedOrgId,
    filters: body.filters,
  });

  if (audience === "customer" && !resolved.customerId) {
    return NextResponse.json(
      { error: "Not signed in to a DevMetrics customer", code: "tenant_required" },
      { status: 401 },
    );
  }

  if (!resolved.customerId) {
    return NextResponse.json(
      { error: "customerId is required for this audience", code: "tenant_required" },
      { status: 400 },
    );
  }

  const embedToken = resolveMintEmbedToken(
    typeof body.embedToken === "string" ? body.embedToken : null,
  );
  if (!embedToken) {
    return NextResponse.json(
      { error: "No embed token is configured for this deployment", code: "not_configured" },
      { status: 501 },
    );
  }

  const result = await mintEmbedSessionForTenant({
    apiUrl: config.apiUrl!,
    embedApiKey: config.embedApiKey!,
    embedToken,
    customerId: resolved.customerId,
    skipTenantRls: resolved.skipTenantRls,
    filters: resolved.filters,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
  }

  return NextResponse.json(result.session);
}
