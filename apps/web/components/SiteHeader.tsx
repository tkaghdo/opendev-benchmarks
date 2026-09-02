"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GITHUB_REPO_URL } from "@/lib/publicLinks";

const links = [
  { href: "/", label: "Explore" },
  { href: "/compare", label: "Compare" },
];

export function SiteHeader({ freshnessLabel }: { freshnessLabel: string }) {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          OpenDev Benchmarks
        </Link>
        <nav className="nav" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="freshness" title="Last successful warehouse ingest">
          {freshnessLabel}
        </span>
        <a href={GITHUB_REPO_URL} className="reveal" rel="noopener noreferrer">
          GitHub
        </a>
        <Link
          href="/how-it-works"
          className="reveal"
          onClick={() => {
            void fetch("/api/funnel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "reveal_click", path: pathname }),
            });
          }}
        >
          See how this was built
        </Link>
      </div>
    </header>
  );
}
