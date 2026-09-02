import { getMetric } from "@opendev/catalog";
import { EmbedSlot } from "@/components/EmbedSlot";
import { KpiCard } from "@/components/KpiCard";
import { NativeKpiValue } from "@/components/NativeKpiValue";
import { formatCount, formatHours, formatRatio } from "@/lib/format";
import { rangeHostFilters } from "@/lib/hostFilters";
import { backlogGrowth, loadOrgSnapshots } from "@/lib/metrics";
import { parseRange, rangeLabel } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function IssuesPage({
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
    return <p className="empty-state">No issue metrics in the warehouse yet.</p>;
  }

  const growth = backlogGrowth(snap);
  const hostFilters = rangeHostFilters(days, { org_id: org });

  return (
    <section>
      <p className="org-meta">
        {rangeLabel(days)} · cards read the governed metrics API. Open backlog is point-in-time, not
        limited to the range.
      </p>
      <dl className="metrics">
        <KpiCard
          name="Issues opened"
          value={formatCount(snap.issuesOpened)}
          liveValue={
            <NativeKpiValue
              metricKey="issues_opened"
              audience="public"
              orgId={org}
              filters={hostFilters}
            />
          }
          metric={{
            key: "issues_opened",
            name: "Issues opened",
            formula: "count of issues created in range",
            source: "issues",
            cubeMeasure: "Issues.count",
            grain: "issue",
            inclusion: "created_at in range",
          }}
        />
        <KpiCard
          name="Issues resolved"
          value={formatCount(snap.issuesClosed)}
          liveValue={
            <NativeKpiValue
              metricKey="issues_resolved"
              audience="public"
              orgId={org}
              filters={hostFilters}
            />
          }
          metric={getMetric("issues_resolved")}
        />
        <KpiCard
          name="Backlog growth"
          value={`${growth > 0 ? "+" : ""}${formatCount(growth)}`}
          liveValue={
            <NativeKpiValue
              metricKey="backlog_growth"
              audience="public"
              orgId={org}
              filters={hostFilters}
            />
          }
          metric={{
            key: "backlog_growth",
            name: "Backlog growth",
            formula: "issues opened minus issues closed in range",
            source: "issues",
            cubeMeasure: "Issues.count",
            grain: "issue",
            inclusion: "created_at / closed_at in range",
          }}
        />
        <KpiCard
          name="Open backlog"
          value={formatCount(snap.openBacklog)}
          liveValue={
            <NativeKpiValue
              metricKey="open_backlog"
              audience="public"
              orgId={org}
              filters={hostFilters}
            />
          }
          metric={{
            key: "open_backlog",
            name: "Open backlog",
            formula: "count of issues never closed",
            source: "issues",
            cubeMeasure: "Issues.count",
            grain: "issue",
            inclusion: "closed_at is null; not limited to the range",
          }}
        />
        <KpiCard
          name="Median issue resolution"
          value={formatHours(snap.medianResolutionHours)}
          liveValue={
            <NativeKpiValue
              metricKey="median_issue_resolution"
              audience="public"
              orgId={org}
              filters={hostFilters}
            />
          }
          metric={getMetric("median_issue_resolution")}
        />
        <KpiCard
          name="Bug ratio"
          value={formatRatio(snap.bugRatio)}
          liveValue={
            <NativeKpiValue metricKey="bug_ratio" audience="public" orgId={org} filters={hostFilters} />
          }
          metric={getMetric("bug_ratio")}
        />
      </dl>
      <EmbedSlot
        audience="public"
        orgId={org}
        slot="issues"
        label="Issues"
        filters={hostFilters}
      />
    </section>
  );
}
