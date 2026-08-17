import { LAUNCH_ORGS } from "@opendev/catalog";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    orgs: LAUNCH_ORGS,
    source: "catalog",
    note: "Build 3 serves the curated catalog. Postgres-backed catalog reads land with the warehouse.",
  });
}
