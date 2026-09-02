import { getMetric } from "@opendev/catalog";
import { EmbedSlot } from "@/components/EmbedSlot";
import { KpiCard } from "@/components/KpiCard";
import { NativeKpiValue } from "@/components/NativeKpiValue";
import { formatCount, formatRatio } from "@/lib/format";
import { rangeHostFilters } from "@/lib/hostFilters";
import { loadOrgSnapshots } from "@/lib/metrics";
import { parseRange, rangeLabel } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function ContributorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { org } = await params;
  const days = parseRange((await searchParams).range);
  const snapshots = await loadOrgSnapshots(days);
  const snap = snapshots.find((row) => row.orgId === org);
  if (!snap) {
    return <p className="empty-state">No contributor metrics in the warehouse yet.</p>;
  }

  const hostFilters = rangeHostFilters(days, { org_id: org });

  return (
    <section>
      <p className="org-meta">{rangeLabel(days)}</p>
      <dl className="metrics">
        <KpiCard
          name="Active contributors"
          value={formatCount(snap.activeContributors)}
          liveValue={
            <NativeKpiValue
              metricKey="active_contributors"
              audience="public"
              orgId={org}
              filters={hostFilters}
            />
          }
          metric={getMetric("active_contributors")}
        />
        <KpiCard
          name="Top-10 concentration"
          value={formatRatio(snap.top10Share)}
          liveValue={
            <NativeKpiValue
              metricKey="contributor_concentration"
              audience="public"
              orgId={org}
              filters={hostFilters}
            />
          }
          metric={getMetric("contributor_concentration")}
        />
      </dl>
      <p className="org-meta">
        Concentration is the share of PRs created in this range by the ten most active authors. Lower
        means activity is more spread out.
      </p>
      <EmbedSlot
        audience="public"
        orgId={org}
        slot="contributors"
        label="Contributors"
        filters={hostFilters}
      />
    </section>
  );
}
