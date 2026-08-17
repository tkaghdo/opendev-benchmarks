import { LAUNCH_ORGS } from "@opendev/catalog";
import Link from "next/link";
import { StubPanel } from "@/components/StubPanel";

export default function InternalDemoPage() {
  return (
    <div className="devmetrics-app">
      <div className="devmetrics-bar">
        <strong>DevMetrics</strong>
        <span>All customers</span>
        <span style={{ marginLeft: "auto" }}>Employee</span>
      </div>
      <div style={{ padding: 24, width: "min(1120px, calc(100% - 32px))", margin: "0 auto" }}>
        <p className="notice">You&apos;re now a DevMetrics employee. Cross-organization analytics use the same assets with skipTenantRls.</p>
        <h1>Internal operations</h1>
        <ul>
          {LAUNCH_ORGS.map((org) => (
            <li key={org.id}>
              <Link href={`/demo/customer/${org.id}`}>{org.name}</Link>
            </li>
          ))}
        </ul>
        <StubPanel build="Build 6">
          Internal sessions skip customer RLS so the same dashboards can benchmark across
          organizations. Do not fork dashboard definitions for this view.
        </StubPanel>
        <p>
          <Link href="/how-it-works">Back to how it works</Link>
        </p>
      </div>
    </div>
  );
}
