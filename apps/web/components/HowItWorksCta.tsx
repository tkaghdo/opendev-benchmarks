"use client";

import Link from "next/link";
import { GITHUB_REPO_URL, PRODUCT_HOME_URL } from "@/lib/publicLinks";

export function HowItWorksCta() {
  return (
    <div className="cta-panel">
      <h2>Want analytics like this inside your product?</h2>
      <p>
        OpenDev is a customer of{" "}
        <a href={PRODUCT_HOME_URL} rel="noopener noreferrer">
          Embedded Canvas
        </a>
        : session mint from a BFF, chromeless <code>@embeddedcanvas/embed-sdk</code>, row-level
        security on <code>org_id</code>. The host app for this site is public on GitHub.
      </p>
      <p>
        <Link
          href="/demo/customer/vercel"
          className="reveal"
          onClick={() => {
            void fetch("/api/funnel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "how_it_works_complete", path: "/how-it-works" }),
            });
          }}
        >
          See the customer embed →
        </Link>
        {" · "}
        <a href={GITHUB_REPO_URL} className="reveal" rel="noopener noreferrer">
          OpenDev source on GitHub →
        </a>
        {" · "}
        <a href={PRODUCT_HOME_URL} className="reveal" rel="noopener noreferrer">
          Embedded Canvas →
        </a>
      </p>
    </div>
  );
}
