"use client";

import { useEffect } from "react";

export function FunnelBeacon({ event }: { event: "product_view" | "reveal_click" | "how_it_works_view" | "how_it_works_complete" }) {
  useEffect(() => {
    void fetch("/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, path: window.location.pathname }),
    });
  }, [event]);
  return null;
}
