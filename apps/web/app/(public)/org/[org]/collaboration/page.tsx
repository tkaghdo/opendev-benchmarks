import { getMetric } from "@opendev/catalog";
import { EmbedSlot } from "@/components/EmbedSlot";
import { KpiCard } from "@/components/KpiCard";
import { NativeKpiValue } from "@/components/NativeKpiValue";
import { StubPanel } from "@/components/StubPanel";
import { formatHours } from "@/lib/format";
import { rangeHostFilters } from "@/lib/hostFilters";
import { loadOrgSnapshots } from "@/lib/metrics";
import { parseRange, rangeLabel } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function CollaborationPage({
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
  const hostFilters = rangeHostFilters(days, { org_id: org });

  return (
    <section>
      <p className="org-meta">{rangeLabel(days)} · first review is a launch metric. Reviewer workload waits for Build 10.</p>
      {snap ? (
        <dl className="metrics">
          <KpiCard
            name="Median time to first review"
            value={formatHours(snap.medianFirstReviewHours)}
            liveValue={
              <NativeKpiValue
                metricKey="median_first_review"
                audience="public"
                orgId={org}
                filters={hostFilters}
              />
            }
            metric={getMetric("median_first_review")}
          />
        </dl>
      ) : (
        <p className="empty-state">No collaboration metrics in the warehouse yet.</p>
      )}
      <EmbedSlot
        audience="public"
        orgId={org}
        slot="collaboration"
        label="First review"
        filters={hostFilters}
      />
      <StubPanel build="Build 10">
        Reviews per PR, reviewer workload, and author/reviewer patterns wait until after launch.
      </StubPanel>
    </section>
  );
}
