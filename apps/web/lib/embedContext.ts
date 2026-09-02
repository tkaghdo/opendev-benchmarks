import { cookies } from "next/headers";
import { DEMO_ORG_IDS, DEMO_TENANT_COOKIE, isDemoOrgId } from "@/lib/demoTenant";
import { allowedEmbedTokens, embedConfig } from "@/lib/embedConfig";
import { type EmbedAudience, type HostAppFilters, type ResolvedEmbedContext } from "@/lib/hostFilters";

export async function getDemoTenantFromCookie(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(DEMO_TENANT_COOKIE)?.value?.trim() ?? "";
  return isDemoOrgId(raw) ? raw : null;
}

export function resolveEmbedContext(input: {
  audience: EmbedAudience;
  cookieOrgId: string | null;
  requestedOrgId?: string | null;
  filters?: HostAppFilters;
}): Omit<ResolvedEmbedContext, "configured" | "embedTokenPresent"> {
  const filters = input.filters ?? {};

  if (input.audience === "customer") {
    const customerId = input.cookieOrgId;
    return {
      audience: "customer",
      customerId,
      skipTenantRls: false,
      filters: {
        ...filters,
        extra: { ...filters.extra, ...(customerId ? { org_id: customerId } : {}) },
      },
      visibleOrgIds: customerId ? [customerId] : [],
    };
  }

  if (input.audience === "internal") {
    return {
      audience: "internal",
      customerId: "internal",
      skipTenantRls: true,
      filters,
      visibleOrgIds: [...DEMO_ORG_IDS],
    };
  }

  const orgId =
    input.requestedOrgId && /^[a-z0-9-]+$/i.test(input.requestedOrgId) ? input.requestedOrgId.toLowerCase() : null;
  return {
    audience: "public",
    customerId: orgId || "public",
    skipTenantRls: !orgId,
    filters: {
      ...filters,
      extra: { ...filters.extra, ...(orgId ? { org_id: orgId } : {}) },
    },
    visibleOrgIds: orgId ? [orgId] : [...DEMO_ORG_IDS],
  };
}

export function parseAudience(raw: unknown): EmbedAudience {
  if (raw === "customer" || raw === "internal" || raw === "public") return raw;
  return "public";
}

export function embedReady(): boolean {
  const config = embedConfig();
  return Boolean(config.apiUrl && config.embedApiKey && (config.embedToken || allowedEmbedTokens().length > 0));
}
