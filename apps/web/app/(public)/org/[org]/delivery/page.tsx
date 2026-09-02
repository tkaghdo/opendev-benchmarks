import { getMetric } from "@opendev/catalog";
import { EmbedSlot } from "@/components/EmbedSlot";
import { KpiCard } from "@/components/KpiCard";
import { NativeKpiValue } from "@/components/NativeKpiValue";
import { formatCount, formatDecimal, formatHours } from "@/lib/format";
import { rangeHostFilters } from "@/lib/hostFilters";
import { loadOrgSnapshots } from "@/lib/metrics";
import { parseRange, rangeLabel } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function DeliveryPage({
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
    return <p className="empty-state">No delivery metrics in the warehouse yet.</p>;
  }

  const weeksPer = days / 7;
  const throughput = weeksPer > 0 ? snap.mergedCount / weeksPer : snap.mergedCount;
  const hostFilters = rangeHostFilters(days, { org_id: org });
  // Every `extra` key becomes a Superset RLS predicate against a column of the
  // same name unless the workspace filter bridge maps it, so only real columns
  // belong here. The slot's embed token is what selects the dashboard. Cube-backed
  // datasets must also publish a member named for the workspace tenant column,
  // which the session pins on every dashboard as its isolation clause.
  const embedFilters = rangeHostFilters(days, { org_id: org });

  return (
    <section>
      <p className="org-meta">
        {rangeLabel(days)} · cards read the governed metrics API; the charts are embedded dashboards.
      </p>
      <dl className="metrics">
        <KpiCard
          name="PRs created"
          value={formatCount(snap.createdCount)}
          liveValue={
            <NativeKpiValue metricKey="prs_created" audience="public" orgId={org} filters={hostFilters} />
          }
          metric={{
            key: "prs_created",
            name: "PRs created",
            formula: "count of pull requests created in range",
            source: "pull_requests",
            cubeMeasure: "PullRequests.count",
            grain: "PR",
            inclusion: "created_at in range",
          }}
        />
        <KpiCard
          name="PRs merged"
          value={formatCount(snap.mergedCount)}
          liveValue={
            <NativeKpiValue metricKey="prs_merged" audience="public" orgId={org} filters={hostFilters} />
          }
          metric={getMetric("prs_merged")}
        />
        <KpiCard
          name="Throughput / week"
          value={formatDecimal(throughput, 1)}
          liveValue={
            <NativeKpiValue
              metricKey="prs_merged"
              audience="public"
              orgId={org}
              filters={hostFilters}
              perWeek
            />
          }
          metric={{
            key: "throughput_week",
            name: "Throughput / week",
            formula: "merged PRs in range / weeks in range",
            source: "pull_requests",
            cubeMeasure: "PullRequests.count",
            grain: "week",
            inclusion: "merged_at in range",
          }}
        />
        <KpiCard
          name="Median PR cycle time"
          value={formatHours(snap.medianCycleHours)}
          liveValue={
            <NativeKpiValue
              metricKey="median_cycle_time"
              audience="public"
              orgId={org}
              filters={hostFilters}
            />
          }
          metric={getMetric("median_cycle_time")}
        />
        <KpiCard
          name="Commits"
          value={formatCount(snap.commitCount)}
          liveValue={
            <NativeKpiValue metricKey="commits" audience="public" orgId={org} filters={hostFilters} />
          }
          metric={
            getMetric("commits") ?? {
              key: "commits",
              name: "Commits",
              formula: "count of commits in range",
              source: "commits",
              cubeMeasure: "Commits.count",
              grain: "commit",
              inclusion: "committed_at in range",
            }
          }
        />
      </dl>
      <h2>PR throughput / week</h2>
      <EmbedSlot
        audience="public"
        orgId={org}
        slot="delivery_throughput"
        label="PR throughput / week"
        filters={embedFilters}
      />
    </section>
  );
}
