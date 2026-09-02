import { NextResponse } from "next/server";
import { DEMO_ORG_IDS } from "@/lib/demoTenant";
import { embedConfig } from "@/lib/embedConfig";
import { embedReady, getDemoTenantFromCookie, parseAudience, resolveEmbedContext } from "@/lib/embedContext";
import type { HostAppFilters } from "@/lib/hostFilters";

/** Resolved security context for the isolation playground. Does not mint a session. */
export async function POST(req: Request) {
  let body: {
    audience?: unknown;
    customerId?: unknown;
    orgId?: unknown;
    filters?: HostAppFilters;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const cookieOrgId = await getDemoTenantFromCookie();
  const audience = parseAudience(body.audience);
  const forgedCustomerId = typeof body.customerId === "string" ? body.customerId : null;
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

  return NextResponse.json({
    ignoredClientCustomerId: forgedCustomerId,
    cookieOrgId,
    resolved: {
      ...resolved,
      configured: embedReady(),
      embedTokenPresent: Boolean(embedConfig().publicEmbedToken),
    },
    allOrgIds: DEMO_ORG_IDS,
    proof:
      audience === "customer" && forgedCustomerId && forgedCustomerId !== resolved.customerId
        ? "Client-supplied customerId was ignored. Cookie wins."
        : audience === "customer"
          ? "Customer session is scoped to the HttpOnly cookie."
          : audience === "internal"
            ? "Internal session is unscoped (skipTenantRls). Same dashboards, all orgs."
            : "Public session is unscoped (skipTenantRls). Host filters select the page organization. Not tenant isolation.",
  });
}
