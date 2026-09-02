import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const result = await searchCatalog(query);
    return NextResponse.json({ query, ...result, source: "postgres" });
  } catch (err) {
    console.error("[opendev] search query failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Warehouse unavailable", query, orgs: [], repos: [], source: "unavailable" },
      { status: 503 },
    );
  }
}
