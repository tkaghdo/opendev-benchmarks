import type { Metadata } from "next";
import Link from "next/link";
import { FunnelBeacon } from "@/components/FunnelBeacon";
import { HowItWorksCta } from "@/components/HowItWorksCta";
import { IsolationPanel } from "@/components/IsolationPanel";
import { MetricInspector } from "@/components/MetricInspector";
import { SurfaceSwitcher } from "@/components/SurfaceSwitcher";
import { GITHUB_REPO_URL, PRODUCT_HOME_URL } from "@/lib/publicLinks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "GitHub to Postgres to Embedded Canvas: the same metrics on public OpenDev, a customer product, and internal operations.",
};

export default function HowItWorksPage() {
  return (
    <section className="how">
      <FunnelBeacon event="how_it_works_view" />
      <p className="kicker">How it works</p>
      <h1>Build analytics once. Deliver them three ways.</h1>
      <p className="lede">
        GitHub → ingestion → Postgres → Embedded Canvas → public OpenDev, a customer product, and
        internal operations. OpenDev is the host.{" "}
        <a href={PRODUCT_HOME_URL} rel="noopener noreferrer">
          Embedded Canvas
        </a>{" "}
        owns the semantic layer, the hosted runtime, and tenant isolation. The host source is on{" "}
        <a href={GITHUB_REPO_URL} rel="noopener noreferrer">
          GitHub
        </a>
        .
      </p>
      <SurfaceSwitcher orgId="vercel" />

      <h2>The pipeline</h2>
      <ol className="pipeline">
        <li>
          <strong>GitHub public data</strong> is ingested by a worker into Postgres. Visitor page
          loads never call GitHub.
        </li>
        <li>
          <strong>Postgres</strong> is the warehouse: orgs, repos, PRs, issues, commits, reviews.
          Every fact row has <code>org_id</code>.
        </li>
        <li>
          <strong>Embedded Canvas</strong> connects to that warehouse, publishes Cube models
          (PullRequests, Issues, Commits, Contributors), and hosts Apache Superset for the
          dashboards this site embeds.
        </li>
        <li>
          <strong>Two read paths</strong> share those definitions: chromeless dashboards via{" "}
          <code>@embeddedcanvas/embed-sdk</code>, and a governed metrics API the host queries for
          the KPI cards above each chart. Neither path recomputes a metric in OpenDev.
        </li>
        <li>
          <strong>Host filters</strong> go out with every embed session: <code>org_id</code> plus a
          date range (30 / 90 / 365 days). Cube publishes both <code>tenantId</code> and{" "}
          <code>org_id</code> so embed RLS matches the warehouse column.
        </li>
        <li>
          <strong>Three audiences</strong> reuse the same dashboards: public OpenDev (unscoped
          session + host filters), DevMetrics customer (RLS on <code>org_id</code>), DevMetrics
          internal (<code>skipTenantRls</code>).
        </li>
      </ol>

      <h2>What each tab shows</h2>
      <ul className="proof-list">
        <li>
          <strong>Overview</strong> — launch KPIs from the governed metrics API, plus an embedded
          org dashboard.
        </li>
        <li>
          <strong>Delivery</strong> — PR throughput as a hosted time-series (merge activity over
          the selected range).
        </li>
        <li>
          <strong>Collaboration</strong> — first-review heatmap (weekday × hour) on{" "}
          <code>PullRequests</code>.
        </li>
        <li>
          <strong>Issues</strong> — weekly intake stacked by bug vs other, with optional Prophet
          forecast in the hosted chart.
        </li>
        <li>
          <strong>Contributors</strong> — active authors and top-10 concentration; embed is PR
          volume by author.
        </li>
        <li>
          <strong>Repositories</strong> — catalog table plus an embed that can take a{" "}
          <code>repo_id</code> host filter when you select a row.
        </li>
      </ul>

      <h2>The same metrics, three surfaces</h2>
      <MetricInspector />

      <h2>Switch audience</h2>
      <p className="lede lede-small">
        Public product → customer view → internal view. Same deployment, same metric definitions,
        same analytics components, different security context.
      </p>
      <p>
        <Link href="/demo/customer/vercel">Open DevMetrics as Vercel</Link>
        {" · "}
        <Link href="/demo/internal">Open internal operations</Link>
        {" · "}
        <Link href="/org/vercel">Back to public Vercel</Link>
      </p>
      <IsolationPanel orgId="vercel" />

      <h2>What this site proves</h2>
      <ul className="proof-list">
        <li>Native embedded analytics (chromeless, host-owned chrome)</li>
        <li>
          Organization and date-range host filters on every public embed
        </li>
        <li>Per-tab dashboards selected by embed tokens, not hardcoded chart SQL in the host</li>
        <li>Same metric definitions on cards and charts</li>
        <li>
          Host-rendered KPI cards served by the governed metrics API — cards resolve through the
          catalog, none are computed in the host
        </li>
        <li>Customer tenant isolation (HttpOnly cookie → <code>customerId</code>)</li>
        <li>Internal cross-customer analytics (<code>skipTenantRls</code>)</li>
      </ul>

      <HowItWorksCta />
    </section>
  );
}
