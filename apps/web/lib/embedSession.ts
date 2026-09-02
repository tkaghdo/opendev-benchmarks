import type { HostAppFilters } from "./hostFilters";

type MintResult =
  | { ok: true; session: Record<string, unknown> }
  | { ok: false; status: number; error: string; code?: string };

export async function mintEmbedSessionForTenant(input: {
  apiUrl: string;
  embedApiKey: string;
  embedToken: string;
  customerId: string;
  skipTenantRls?: boolean;
  filters?: HostAppFilters;
}): Promise<MintResult> {
  let res: Response;
  try {
    res = await fetch(`${input.apiUrl}/public/embed/v1/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.embedApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embedToken: input.embedToken,
        customerId: input.customerId,
        ...(input.skipTenantRls ? { skipTenantRls: true } : {}),
        ...(input.filters ? { filters: input.filters } : {}),
      }),
      cache: "no-store",
    });
  } catch (err) {
    const cause = err instanceof Error ? err.message : "fetch failed";
    return {
      ok: false,
      status: 502,
      error: `Could not reach Embedded Canvas at ${input.apiUrl} (${cause})`,
      code: "upstream_unreachable",
    };
  }

  const raw = await res.text();
  let data: Record<string, unknown> & { error?: string; code?: string } = {};
  try {
    data = raw ? (JSON.parse(raw) as typeof data) : {};
  } catch {
    return {
      ok: false,
      status: res.status || 502,
      error: raw.trim() ? raw.slice(0, 300) : "Embedded Canvas returned a non-JSON session response",
      code: "upstream_invalid_json",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: typeof data.error === "string" ? data.error : "Session mint failed",
      code: typeof data.code === "string" ? data.code : undefined,
    };
  }

  return { ok: true, session: data };
}
