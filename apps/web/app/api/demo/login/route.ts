import { NextResponse } from "next/server";
import { DEMO_TENANT_COOKIE, isDemoOrgId } from "@/lib/demoTenant";

export async function POST(req: Request) {
  let tenantId = "";
  try {
    const body = (await req.json()) as { tenantId?: string };
    tenantId = body.tenantId?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isDemoOrgId(tenantId)) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, tenantId });
  res.cookies.set(DEMO_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
