import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatFreshness, getFreshness } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const freshness = await getFreshness();
  const freshnessLabel = freshness.available
    ? formatFreshness(freshness.lastSuccessAt)
    : "Warehouse offline";

  return (
    <div className="shell">
      <SiteHeader freshnessLabel={freshnessLabel} />
      <main className="shell-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
