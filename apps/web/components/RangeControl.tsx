"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RANGE_DAYS } from "@/lib/range";

export function RangeControl() {
  const pathname = usePathname();
  const search = useSearchParams();
  const current = search.get("range") ?? "365";

  return (
    <div className="range" role="group" aria-label="Time range">
      {RANGE_DAYS.map((days) => {
        const value = String(days);
        const params = new URLSearchParams(search.toString());
        params.set("range", value);
        const href = `${pathname}?${params.toString()}`;
        const active = current === value;
        return (
          <Link key={days} href={href} className={active ? "range-btn is-active" : "range-btn"}>
            {days === 365 ? "12 months" : `${days}d`}
          </Link>
        );
      })}
    </div>
  );
}
