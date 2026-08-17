import { LAUNCH_ORGS } from "@opendev/catalog";
import Image from "next/image";
import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";

export default function HomePage() {
  return (
    <section className="hero">
      <p className="kicker">OpenDev Benchmarks</p>
      <h1>How does the world&apos;s best software get built?</h1>
      <p className="lede">
        Explore engineering velocity, collaboration, contributor activity, issue resolution, and
        development patterns across leading open-source organizations.
      </p>
      <SearchBox />
      <p className="kicker">Featured organizations</p>
      <div className="grid">
        {LAUNCH_ORGS.map((org) => (
          <Link key={org.id} href={`/org/${org.id}`} className="org-card">
            <Image src={org.avatarUrl} alt="" width={36} height={36} unoptimized />
            <div>
              <strong>{org.name}</strong>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{org.githubLogin}</div>
            </div>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 40 }}>
        <p className="kicker">Benchmark highlights</p>
        <p className="lede" style={{ fontSize: "1rem" }}>
          Fastest PR reviews, cycle time, contributor growth, and throughput land in Build 8. Org
          metrics land in Build 4.
        </p>
      </div>
    </section>
  );
}
