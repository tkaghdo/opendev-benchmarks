import Link from "next/link";
import { ComparePicker } from "@/components/ComparePicker";
import { StubPanel } from "@/components/StubPanel";
import { listOrgs } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function CompareIndexPage() {
  let orgs: Awaited<ReturnType<typeof listOrgs>> = [];
  try {
    orgs = await listOrgs();
  } catch {
    orgs = [];
  }

  const pairs = [
    ["vercel", "supabase"],
    ["prisma", "temporal"],
    ["hashicorp", "vercel"],
  ] as const;

  return (
    <section>
      <h1>Compare organizations</h1>
      <p className="lede">
        Pick two launch organizations. Scorecards use the 30 / 90 / 365 range; the cycle-time overlay is
        12 months.
      </p>
      <ComparePicker orgs={orgs.map((org) => ({ id: org.id, name: org.name }))} />
      {orgs.length > 0 ? (
        <div className="grid pair-grid">
          {pairs.map(([a, b]) => {
            const left = orgs.find((org) => org.id === a);
            const right = orgs.find((org) => org.id === b);
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
      ) : (
        <p className="empty-state">No organizations in the warehouse to compare yet.</p>
      )}
      <div className="stack-gap">
        <StubPanel build="Build 8">Multi-organization comparisons (third and Nth org) wait until after launch.</StubPanel>
      </div>
    </section>
  );
}
