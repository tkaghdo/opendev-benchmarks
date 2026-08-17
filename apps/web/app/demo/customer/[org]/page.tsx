import { LAUNCH_ORGS, getOrg } from "@opendev/catalog";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StubPanel } from "@/components/StubPanel";

export default async function CustomerDemoPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: orgId } = await params;
  const org = getOrg(orgId);
  if (!org) notFound();

  return (
    <div className="devmetrics-app">
      <div className="devmetrics-bar">
        <strong>DevMetrics</strong>
        <span>Home</span>
        <span>Engineering</span>
        <span>Repositories</span>
        <span>Team</span>
        <span>Analytics</span>
        <span>Settings</span>
        <span style={{ marginLeft: "auto" }}>Customer: {org.name}</span>
      </div>
      <div style={{ padding: 24, width: "min(1120px, calc(100% - 32px))", margin: "0 auto" }}>
        <p className="notice">
          You are viewing the fictional customer embed. Only {org.name} data will be visible once
          tenant RLS is wired in Build 6.
        </p>
        <h1>{org.name} analytics</h1>
        <StubPanel build="Build 5 / 6">
          Chromeless Embedded Canvas mounts here. Session mint sets customerId to{" "}
          <code>{org.id}</code>. The same dashboard ids are reused on OpenDev public and internal
          views. Switch customer:{" "}
          {LAUNCH_ORGS.map((item, index) => (
            <span key={item.id}>
              {index > 0 ? " · " : null}
              <Link href={`/demo/customer/${item.id}`}>{item.name}</Link>
            </span>
          ))}
        </StubPanel>
        <p>
          Switch to <Link href="/demo/internal">internal operations</Link>
          {" · "}
          <Link href={`/org/${org.id}`}>public OpenDev page</Link>
        </p>
      </div>
    </div>
  );
}
