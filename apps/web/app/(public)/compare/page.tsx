import { LAUNCH_ORGS } from "@opendev/catalog";
import Link from "next/link";
import { StubPanel } from "@/components/StubPanel";

export default function CompareIndexPage() {
  const pairs = [
    ["vercel", "supabase"],
    ["prisma", "temporal"],
    ["hashicorp", "vercel"],
  ] as const;

  return (
    <section>
      <h1>Compare organizations</h1>
      <p className="lede">
        Pick two launch organizations. The scorecard and 12-month overlays land in Build 4.
      </p>
      <div className="grid">
        {pairs.map(([a, b]) => {
          const left = LAUNCH_ORGS.find((org) => org.id === a);
          const right = LAUNCH_ORGS.find((org) => org.id === b);
          if (!left || !right) return null;
          return (
            <Link key={`${a}-${b}`} href={`/compare/${a}/${b}`} className="org-card">
              <strong>
                {left.name} vs {right.name}
              </strong>
            </Link>
          );
        })}
      </div>
      <div style={{ marginTop: 24 }}>
        <StubPanel build="Build 8">Multi-organization comparisons (third and Nth org) wait until after launch.</StubPanel>
      </div>
    </section>
  );
}
