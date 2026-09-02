"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMO_ORG_IDS } from "@/lib/demoTenant";
import type { EmbedAudience } from "@/lib/hostFilters";

type ContextResponse = {
  ignoredClientCustomerId: string | null;
  cookieOrgId: string | null;
  resolved: {
    audience: EmbedAudience;
    customerId: string | null;
    skipTenantRls: boolean;
    visibleOrgIds: string[];
  };
  proof: string;
};

export function IsolationPanel({ orgId }: { orgId?: string }) {
  const [audience, setAudience] = useState<EmbedAudience>("customer");
  const [forged, setForged] = useState("supabase");
  const [result, setResult] = useState<ContextResponse | null>(null);

  const load = useCallback(
    async (nextAudience: EmbedAudience, forgedId: string) => {
      const res = await fetch("/api/analytics/context", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: nextAudience,
          customerId: forgedId,
          orgId,
        }),
      });
      const data = (await res.json()) as ContextResponse;
      setResult(data);
    },
    [orgId],
  );

  useEffect(() => {
    void load(audience, forged);
  }, [audience, forged, load]);

  return (
    <section className="isolation">
      <h2>Tenant isolation</h2>
      <p className="org-meta">
        Same dashboards. The BFF derives <code>customerId</code> from an HttpOnly cookie (customer)
        or sets <code>skipTenantRls</code> (internal). The forged body field is ignored.
      </p>
      {!result?.cookieOrgId ? (
        <p className="org-meta">
          Open a customer view first so the tenant cookie is set, then try forging another org id.
        </p>
      ) : null}
      <div className="range">
        <button type="button" className={audience === "customer" ? "range-btn is-active" : "range-btn"} onClick={() => setAudience("customer")}>
          Customer
        </button>
        <button type="button" className={audience === "internal" ? "range-btn is-active" : "range-btn"} onClick={() => setAudience("internal")}>
          Internal
        </button>
      </div>
      <label className="org-meta isolation-forged">
        Forged <code>customerId</code> in the request body{" "}
        <select value={forged} onChange={(event) => setForged(event.target.value)}>
          {DEMO_ORG_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      {result ? (
        <>
          <pre className="context-json">{JSON.stringify(result, null, 2)}</pre>
          <p className="notice">{result.proof}</p>
          <p className="org-meta">
            Visible organizations: {result.resolved.visibleOrgIds.join(", ") || "none"}
          </p>
        </>
      ) : null}
    </section>
  );
}
