"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SurfaceSwitcher({ orgId }: { orgId?: string }) {
  const pathname = usePathname();
  const customerHref = `/demo/customer/${orgId || "vercel"}`;
  const items = [
    { href: orgId ? `/org/${orgId}` : "/", label: "Public product", id: "public" },
    { href: customerHref, label: "Customer view", id: "customer" },
    { href: "/demo/internal", label: "Internal view", id: "internal" },
  ];

  return (
    <nav className="surface-switch" aria-label="Audience">
      {items.map((item) => {
        const active =
          item.id === "public"
            ? pathname.startsWith("/org") || pathname.startsWith("/compare")
            : item.id === "customer"
              ? pathname.startsWith("/demo/customer")
              : pathname.startsWith("/demo/internal");
        return (
          <Link key={item.id} href={item.href} className={active ? "is-active" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
