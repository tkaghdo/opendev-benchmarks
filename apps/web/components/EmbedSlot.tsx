"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { EmbedAudience, HostAppFilters } from "@/lib/hostFilters";
import { publicTokenForSlot, type EmbedSlotId } from "@/lib/embedTokens";

const EmbeddedAnalytics = dynamic(
  () => import("./EmbeddedAnalyticsClient").then((mod) => mod.EmbeddedAnalytics),
  {
    ssr: false,
    loading: () => (
      <aside className="embed-slot embed-slot-wait">
        <p className="kicker">Dashboard</p>
        <p>Loading chromeless analytics…</p>
      </aside>
    ),
  },
);

function sdkCustomerId(audience: EmbedAudience, orgId?: string): string {
  if (audience === "internal") return "internal";
  if (audience === "public") return "public";
  return orgId || "";
}

export function EmbedSlot({
  audience,
  orgId,
  filters,
  label,
  embedToken,
  slot,
}: {
  audience: EmbedAudience;
  orgId?: string;
  filters?: HostAppFilters;
  label: string;
  embedToken?: string;
  slot?: EmbedSlotId;
}) {
  const [error, setError] = useState<string | null>(null);
  const token = useMemo(
    () => embedToken?.trim() || publicTokenForSlot(slot),
    [embedToken, slot],
  );
  const customerId = sdkCustomerId(audience, orgId);

  if (!token) {
    return (
      <aside className="embed-slot embed-slot-wait" aria-label={label}>
        <p className="kicker">Dashboard slot · {label}</p>
        <p>
          Chromeless Embedded Canvas mounts here after you register a dashboard and set{" "}
          <code>NEXT_PUBLIC_EMBED_TOKEN</code>. Warehouse metrics on this page stay until then.
        </p>
        <p className="org-meta">
          Audience <code>{audience}</code>
          {orgId ? (
            <>
              {" "}
              · org <code>{orgId}</code>
            </>
          ) : null}
          {filters?.dateFrom ? (
            <>
              {" "}
              · {filters.dateFrom} → {filters.dateTo}
            </>
          ) : null}
          {filters?.extra?.repo_id ? (
            <>
              {" "}
              · repo <code>{filters.extra.repo_name || filters.extra.repo_id}</code>
            </>
          ) : null}
        </p>
      </aside>
    );
  }

  return (
    <div className="embed-slot" aria-label={label}>
      {error ? <p className="notice notice-warn">{error}</p> : null}
      <EmbeddedAnalytics
        embedToken={token}
	autoHeight
        customerId={customerId || "public"}
        className={
          slot === "overview"
            ? "embedded-analytics embedded-analytics-overview"
            : "embedded-analytics"
        }
        layoutMode="chromeless"
        hostTheme={true}
        filters={filters}
        events={{
          onError: (err) => setError(err.message),
        }}
        fetchSession={() =>
          fetch("/api/analytics/session", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audience,
              orgId,
              embedToken: token,
              filters,
            }),
          }).then(async (res) => {
            const data = await res.json();
            if (!res.ok) {
              const message =
                typeof data.error === "string" ? data.error : "Session mint failed";
              setError(message);
              throw Object.assign(new Error(message), data);
            }
            setError(null);
            return data;
          })
        }
      />
    </div>
  );
}
