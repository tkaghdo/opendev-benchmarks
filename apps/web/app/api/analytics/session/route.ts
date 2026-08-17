import { NextResponse } from "next/server";
import { embedConfig } from "@/lib/embedConfig";

/**
 * Build 5 wires this to Embedded Canvas.
 * Never trust a client-supplied tenant id; derive customerId from an HttpOnly cookie (Build 6).
 */
export async function POST() {
  const config = embedConfig();
  if (!config.apiUrl || !config.embedApiKey || !config.embedToken) {
    return NextResponse.json(
      {
        error: "Embedded Canvas is not configured. Session mint lands in Build 5.",
        code: "not_configured",
      },
      { status: 501 },
    );
  }

  return NextResponse.json(
    {
      error: "Session mint is stubbed until Build 5. Do not accept customerId from the request body.",
      code: "not_implemented",
    },
    { status: 501 },
  );
}
