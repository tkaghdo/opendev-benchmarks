import { NextResponse } from "next/server";
import { getFreshness, listOrgs } from "@/lib/warehouse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [orgs, freshness] = await Promise.all([listOrgs(), getFreshness()]);
    return NextResponse.json({
      orgs,
      lastSuccessAt: freshness.lastSuccessAt?.toISOString() ?? null,
      source: "postgres",
    });
  } catch (err) {
    console.error("[opendev] catalog query failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Warehouse unavailable", source: "unavailable", orgs: [] },
      { status: 503 },
    );
  }
}
