import Link from "next/link";
import { EmbedSlot } from "@/components/EmbedSlot";
import { IsolationPanel } from "@/components/IsolationPanel";
import { SurfaceSwitcher } from "@/components/SurfaceSwitcher";
import { listOrgsWithFallback } from "@/lib/catalogFallback";
import { rangeHostFilters } from "@/lib/hostFilters";

export const dynamic = "force-dynamic";

export default async function InternalDemoPage() {
  const orgs = await listOrgsWithFallback();

  return (
    <div className="devmetrics-app">
      <div className="devmetrics-bar">
        <strong>DevMetrics</strong>
        <span>All customers</span>
        <span className="devmetrics-tenant">Employee</span>
      </div>
      <div className="devmetrics-body">
        <p className="notice">
          You&apos;re now a DevMetrics employee. Cross-organization analytics use the same dashboards
          with <code>skipTenantRls</code>. Do not fork dashboard definitions for this view.
        </p>
        <SurfaceSwitcher orgId="vercel" />
        <h1>Internal operations</h1>
        <p className="org-meta">
          Open a customer:{" "}
          {orgs.map((org, index) => (
            <span key={org.id}>
              {index > 0 ? " · " : null}
              <Link href={`/demo/customer/${org.id}`}>{org.name}</Link>
            </span>
          ))}
        </p>
        <EmbedSlot
          audience="internal"
          slot="internal"
          label="Internal analytics"
          filters={rangeHostFilters(365)}
        />
        <IsolationPanel />
        <p>
          <Link href="/how-it-works">How it works</Link>
          {" · "}
          <Link href="/">Public OpenDev</Link>
        </p>
      </div>
    </div>
  );
}
