import Link from "next/link";
import { notFound } from "next/navigation";
import { EmbedSlot } from "@/components/EmbedSlot";
import { IsolationPanel } from "@/components/IsolationPanel";
import { KpiCard } from "@/components/KpiCard";
import { NativeKpiValue } from "@/components/NativeKpiValue";
import { SurfaceSwitcher } from "@/components/SurfaceSwitcher";
import { getOrgWithFallback, listOrgsWithFallback } from "@/lib/catalogFallback";
import { formatCount, formatHours } from "@/lib/format";
import { rangeHostFilters } from "@/lib/hostFilters";
import { loadOrgSnapshots } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function CustomerDemoPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgId } = await params;
  const org = await getOrgWithFallback(orgId);
  if (!org) notFound();

  const orgs = await listOrgsWithFallback();
  let snap = null;
  try {
    const snapshots = await loadOrgSnapshots(365);
    snap = snapshots.find((row) => row.orgId === org.id) ?? null;
  } catch {
    snap = null;
  }

  // The governed cards are scoped by the demo tenant cookie, not by this
  // orgId: the metrics BFF ignores a customer-audience org sent in the body.
  const hostFilters = rangeHostFilters(365, { org_id: org.id });

  return (
    <div className="devmetrics-app">
      <div className="devmetrics-bar">
        <strong>DevMetrics</strong>
        <span>Home</span>
        <span>Engineering</span>
        <span>Repositories</span>
        <span>Team</span>
        <span className="is-nav-current">Analytics</span>
        <span>Settings</span>
        <span className="devmetrics-tenant">Customer: {org.name}</span>
      </div>
      <div className="devmetrics-body">
        <p className="notice">
          You&apos;re viewing DevMetrics as {org.name}. Only {org.name} data is in this security
          context. The session BFF reads an HttpOnly cookie, not the request body.
        </p>
        <SurfaceSwitcher orgId={org.id} />
        <h1>{org.name} analytics</h1>
        {snap ? (
          <dl className="metrics">
            <KpiCard
              name="PRs merged"
              value={formatCount(snap.mergedCount)}
              liveValue={
                <NativeKpiValue
                  metricKey="prs_merged"
                  audience="customer"
                  orgId={org.id}
                  filters={hostFilters}
                />
              }
            />
            <KpiCard
              name="Median PR cycle time"
              value={formatHours(snap.medianCycleHours)}
              liveValue={
                <NativeKpiValue
                  metricKey="median_cycle_time"
                  audience="customer"
                  orgId={org.id}
                  filters={hostFilters}
                />
              }
            />
            <KpiCard
              name="Median time to first review"
              value={formatHours(snap.medianFirstReviewHours)}
              liveValue={
                <NativeKpiValue
                  metricKey="median_first_review"
                  audience="customer"
                  orgId={org.id}
                  filters={hostFilters}
                />
              }
            />
            <KpiCard
              name="Active contributors"
              value={formatCount(snap.activeContributors)}
              liveValue={
                <NativeKpiValue
                  metricKey="active_contributors"
                  audience="customer"
                  orgId={org.id}
                  filters={hostFilters}
                />
              }
            />
          </dl>
        ) : null}
        <EmbedSlot
          audience="customer"
          orgId={org.id}
          slot="customer"
          label="Customer analytics"
          filters={hostFilters}
        />
        <p className="org-meta">
          Switch customer:{" "}
          {orgs.map((item, index) => (
            <span key={item.id}>
              {index > 0 ? " · " : null}
              <Link href={`/demo/customer/${item.id}`}>{item.name}</Link>
            </span>
          ))}
        </p>
        <IsolationPanel orgId={org.id} />
        <p>
          <Link href="/demo/internal">Internal operations</Link>
          {" · "}
          <Link href={`/org/${org.id}`}>Public OpenDev</Link>
        </p>
      </div>
    </div>
  );
}
