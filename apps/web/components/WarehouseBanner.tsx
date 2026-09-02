import Link from "next/link";
import type { WarehouseFreshness } from "@/lib/warehouse";

export function WarehouseBanner({ freshness }: { freshness: WarehouseFreshness }) {
  if (!freshness.available) {
    return (
      <div className="banner banner-warn" role="status">
        Warehouse is unreachable. Search and organization pages need Postgres — GitHub is never
        queried from the browser.
      </div>
    );
  }
  if (!freshness.lastSuccessAt) {
    return (
      <div className="banner banner-warn" role="status">
        No successful ingest yet. Run the OpenDev worker, then refresh. Visitor pages never call
        GitHub.
      </div>
    );
  }
  if (!freshness.lagging) return null;
  return (
    <div className="banner banner-warn" role="status">
      Warehouse ingest is lagging (last success more than 8 hours ago).{" "}
      <Link href="/">Explore featured organizations</Link> still load from Postgres.
    </div>
  );
}
