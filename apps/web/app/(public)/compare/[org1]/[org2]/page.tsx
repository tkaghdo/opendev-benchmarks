import { Suspense } from "react";
import { notFound } from "next/navigation";
import { EmbedSlot } from "@/components/EmbedSlot";
import { RangeControl } from "@/components/RangeControl";
import { DualSparkline } from "@/components/Sparkline";
import { RevealLink } from "@/components/MetricPlaceholders";
import { vsMedianCopy } from "@/lib/format";
import { rangeHostFilters } from "@/lib/hostFilters";
import { loadCycleOverlay, loadOrgSnapshots, medianOf } from "@/lib/metrics";
import { parseRange, rangeLabel } from "@/lib/range";
import { getOrg } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ org1: string; org2: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { org1, org2 } = await params;
  const days = parseRange((await searchParams).range);
  let left = null;
  let right = null;
  try {
    [left, right] = await Promise.all([getOrg(org1), getOrg(org2)]);
  } catch {
    notFound();
  }
  if (!left || !right) notFound();

  const [snapshots, overlay] = await Promise.all([
    loadOrgSnapshots(days),
    loadCycleOverlay([left.id, right.id], 365),
  ]);
  const a = snapshots.find((row) => row.orgId === left.id);
  const b = snapshots.find((row) => row.orgId === right.id);
  if (!a || !b) notFound();

  return (
    <section>
      <h1>
        {left.name} vs {right.name}
      </h1>
      <p className="org-meta">
        {rangeLabel(days)} · the embedded dashboards follow this range. Overlay is always 12 months of
        weekly median cycle time.
      </p>
      <Suspense fallback={null}>
        <RangeControl />
      </Suspense>
      <h2>12-month median PR cycle time</h2>
      <DualSparkline
        left={overlay.map((point) => point.left)}
        right={overlay.map((point) => point.right)}
        labels={overlay.map((point) => point.week)}
        leftName={left.name}
        rightName={right.name}
      />
      <p className="org-meta">
        {left.name} cycle time is{" "}
        {vsMedianCopy(a.medianCycleHours, medianOf(snapshots.map((row) => row.medianCycleHours)), true) ??
          "uncompared"}
        .
      </p>
      <div className="compare-embeds">
        <EmbedSlot
          audience="public"
          orgId={left.id}
          slot="compare"
          label={`${left.name} dashboard`}
          filters={rangeHostFilters(days, { org_id: left.id })}
        />
        <EmbedSlot
          audience="public"
          orgId={right.id}
          slot="compare"
          label={`${right.name} dashboard`}
          filters={rangeHostFilters(days, { org_id: right.id })}
        />
      </div>
      <RevealLink />
    </section>
  );
}
