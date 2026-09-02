import { NextResponse } from "next/server";
import { warehouseQuery } from "@/lib/warehouse";

const EVENTS = new Set(["product_view", "reveal_click", "how_it_works_view", "how_it_works_complete"]);

export async function POST(req: Request) {
  let name = "";
  let path = "";
  try {
    const body = (await req.json()) as { event?: string; path?: string };
    name = body.event?.trim() ?? "";
    path = body.path?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!EVENTS.has(name)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  try {
    await warehouseQuery(
      `
      create table if not exists product_events (
        id bigserial primary key,
        name text not null,
        path text,
        created_at timestamptz not null default now()
      )
      `,
    );
    await warehouseQuery(`insert into product_events (name, path) values ($1, $2)`, [name, path || null]);
  } catch {
    /* warehouse optional for local UI */
  }

  return NextResponse.json({ ok: true });
}
