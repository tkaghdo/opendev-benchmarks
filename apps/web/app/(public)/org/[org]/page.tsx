import { getMetric } from "@opendev/catalog";
import { DashboardEmbed } from "@/components/DashboardEmbed";
import { KpiCard } from "@/components/KpiCard";
import { RevealLink } from "@/components/MetricPlaceholders";
import { NativeKpiValue } from "@/components/NativeKpiValue";
import { formatCount, formatDecimal, formatHours, vsMedianCopy } from "@/lib/format";
import { rangeHostFilters } from "@/lib/hostFilters";
import { loadOrgSnapshots, medianOf, prsPerActive } from "@/lib/metrics";
import { nativeKpiSpec } from "@/lib/nativeKpiMetrics";
import { parseRange, rangeLabel } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function OrgOverviewPage({
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
    return <p className="empty-state">No warehouse metrics for this organization yet.</p>;
  }

  const hostFilters = rangeHostFilters(days, { org_id: org });
  // Warehouse values stay as the server-rendered fallback for any card the
  // governed registry does not cover, and as the value in view-source.
  const medians = {
    cycle: medianOf(snapshots.map((row) => row.medianCycleHours)),
    review: medianOf(snapshots.map((row) => row.medianFirstReviewHours)),
    merged: medianOf(snapshots.map((row) => row.mergedCount)),
    active: medianOf(snapshots.map((row) => row.activeContributors)),
    resolved: medianOf(snapshots.map((row) => row.issuesClosed)),
    resolution: medianOf(snapshots.map((row) => row.medianResolutionHours)),
    commits: medianOf(snapshots.map((row) => row.commitCount)),
    perActive: medianOf(snapshots.map((row) => prsPerActive(row))),
  };

  const perActive = prsPerActive(snap);
  const kpis = [
    {
      key: "prs_merged",
      value: formatCount(snap.mergedCount),
      vs: vsMedianCopy(snap.mergedCount, medians.merged, false),
    },
    {
      key: "median_cycle_time",
      value: formatHours(snap.medianCycleHours),
      vs: vsMedianCopy(snap.medianCycleHours, medians.cycle, true),
    },
    {
      key: "median_first_review",
      value: formatHours(snap.medianFirstReviewHours),
      vs: vsMedianCopy(snap.medianFirstReviewHours, medians.review, true),
    },
    {
      key: "prs_per_active",
      name: "PRs per active contributor",
      value: formatDecimal(perActive, 1),
      vs: vsMedianCopy(perActive, medians.perActive, false),
      formula: "merged PRs / distinct PR authors in range",
      inclusion: "merged_at in range; author_id is not null",
    },
    {
      key: "active_contributors",
      value: formatCount(snap.activeContributors),
      vs: vsMedianCopy(snap.activeContributors, medians.active, false),
    },
    {
      key: "issues_resolved",
      value: formatCount(snap.issuesClosed),
      vs: vsMedianCopy(snap.issuesClosed, medians.resolved, false),
    },
    {
      key: "median_issue_resolution",
      value: formatHours(snap.medianResolutionHours),
      vs: vsMedianCopy(snap.medianResolutionHours, medians.resolution, true),
    },
    {
      key: "commits",
      name: "Commits",
      value: formatCount(snap.commitCount),
      vs: vsMedianCopy(snap.commitCount, medians.commits, false),
      formula: "count of commits in range",
      inclusion: "committed_at in range",
    },
  ];

  return (
    <>
      <p className="org-meta">
        {rangeLabel(days)} · cards read the governed metrics API. OpenDev median is the median of the
        five launch orgs.
      </p>
      <dl className="metrics">
        {kpis.map((kpi) => {
          const metric = getMetric(kpi.key);
          // A governed card supplies its own value and its own vs-median line,
          // so passing the warehouse vs too would render the comparison twice.
          const governed = nativeKpiSpec(kpi.key) != null;
          return (
            <KpiCard
              key={kpi.key}
              name={kpi.name ?? metric?.name ?? kpi.key}
              value={kpi.value}
              vs={governed ? null : kpi.vs}
              liveValue={
                governed ? (
                  <NativeKpiValue
                    metricKey={kpi.key}
                    audience="public"
                    orgId={org}
                    filters={hostFilters}
                  />
                ) : undefined
              }
              metric={
                metric ?? {
                  key: kpi.key,
                  name: kpi.name ?? kpi.key,
                  formula: kpi.formula ?? "",
                  source: "warehouse",
                  cubeMeasure: "",
                  grain: "org",
                  inclusion: kpi.inclusion ?? "",
                }
              }
            />
          );
        })}
      </dl>
      <div className="overview-embed">
        <DashboardEmbed
          audience="public"
          orgId={org}
          slot="overview"
          label="Overview"
          filters={hostFilters}
        />
      </div>
      <RevealLink />
    </>
  );
}
