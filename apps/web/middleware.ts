import { NextResponse } from "next/server";
import { DEMO_TENANT_COOKIE, isDemoOrgId } from "@/lib/demoTenant";

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");

  const frameSrc = new Set<string>(["'self'"]);
  for (const raw of [
    process.env.EMBEDDED_CANVAS_APP_URL,
    process.env.EMBEDDED_CANVAS_API_URL,
    process.env.NEXT_PUBLIC_EMBED_ORIGIN,
  ]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      const parsed = new URL(value);
      frameSrc.add(parsed.origin);
      if (parsed.hostname.endsWith("embeddedcanvas.com")) {
        frameSrc.add("https://*.embeddedcanvas.com");
        frameSrc.add("https://*.superset.embeddedcanvas.com");
      }
    } catch {
      frameSrc.add(value.replace(/\/$/, ""));
    }
  }
  if (frameSrc.size > 1) {
    res.headers.set("Content-Security-Policy", `frame-src ${[...frameSrc].join(" ")}`);
  }
  return res;
}

export function middleware(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.next();
  const match = url.pathname.match(/^\/demo\/customer\/([^/]+)\/?$/);
  if (match) {
    const orgId = decodeURIComponent(match[1] ?? "").toLowerCase();
    if (isDemoOrgId(orgId)) {
      res.cookies.set(DEMO_TENANT_COOKIE, orgId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      });
    }
  }
  return withSecurityHeaders(res);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
