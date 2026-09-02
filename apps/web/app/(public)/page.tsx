import Image from "next/image";
import Link from "next/link";
import { FunnelBeacon } from "@/components/FunnelBeacon";
import { SearchBox } from "@/components/SearchBox";
import { listOrgs } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let orgs: Awaited<ReturnType<typeof listOrgs>> = [];
  let warehouseError = false;
  try {
    orgs = await listOrgs();
  } catch {
    warehouseError = true;
  }

  return (
    <section className="hero">
      <FunnelBeacon event="product_view" />
      <p className="kicker">OpenDev Benchmarks</p>
      <h1>How does the world&apos;s best software get built?</h1>
      <p className="lede">
        Explore engineering velocity, collaboration, contributor activity, issue resolution, and
        development patterns across leading open-source organizations.
      </p>
      <SearchBox />
      <p className="kicker">Featured organizations</p>
      {warehouseError ? (
        <p className="empty-state">The warehouse is unreachable. Start Postgres and refresh.</p>
      ) : orgs.length === 0 ? (
        <p className="empty-state">
          No organizations in the warehouse yet. After ingest, Vercel, Supabase, Prisma, Temporal,
          and HashiCorp appear here.
        </p>
      ) : (
        <div className="grid">
          {orgs.map((org) => (
            <Link key={org.id} href={`/org/${org.id}`} className="org-card">
              {org.avatarUrl ? (
                <Image src={org.avatarUrl} alt="" width={36} height={36} unoptimized />
              ) : (
                <span className="org-fallback" aria-hidden>
                  {org.name.slice(0, 1)}
                </span>
              )}
              <div>
                <strong>{org.name}</strong>
                <div className="org-meta">
                  {org.githubLogin}
                  {org.repoCount > 0 ? ` · ${org.repoCount} repos` : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="hero-note">
        <p className="kicker">Benchmark highlights</p>
        <p className="lede lede-small">
        Org metrics live on each organization page.
        </p>
      </div>
    </section>
  );
}
