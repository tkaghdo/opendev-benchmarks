"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { slug: "", label: "Overview" },
  { slug: "delivery", label: "Delivery" },
  { slug: "collaboration", label: "Collaboration" },
  { slug: "issues", label: "Issues" },
  { slug: "contributors", label: "Contributors" },
  { slug: "repos", label: "Repositories" },
] as const;

export function OrgTabs({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const base = `/org/${orgId}`;

  return (
    <nav className="tabs" aria-label="Organization sections">
      {tabs.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = tab.slug === "" ? pathname === base : pathname.startsWith(`${base}/${tab.slug}`);
        return (
          <Link key={tab.label} href={href} aria-current={active ? "page" : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
