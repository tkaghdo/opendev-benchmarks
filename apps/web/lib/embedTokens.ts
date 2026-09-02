export type EmbedSlotId =
  | "overview"
  | "delivery"
  | "delivery_throughput"
  | "delivery_cycle_time"
  | "delivery_commits"
  | "issues"
  | "contributors"
  | "repos"
  | "collaboration"
  | "compare"
  | "customer"
  | "internal";

const SLOT_PUBLIC_ENV: Record<EmbedSlotId, string | undefined> = {
  overview: process.env.NEXT_PUBLIC_EMBED_TOKEN_OVERVIEW,
  delivery: process.env.NEXT_PUBLIC_EMBED_TOKEN_DELIVERY,
  delivery_throughput: process.env.NEXT_PUBLIC_EMBED_TOKEN_DELIVERY_THROUGHPUT,
  delivery_cycle_time: process.env.NEXT_PUBLIC_EMBED_TOKEN_DELIVERY_CYCLE_TIME,
  delivery_commits: process.env.NEXT_PUBLIC_EMBED_TOKEN_DELIVERY_COMMITS,
  issues: process.env.NEXT_PUBLIC_EMBED_TOKEN_ISSUES,
  contributors: process.env.NEXT_PUBLIC_EMBED_TOKEN_CONTRIBUTORS,
  repos: process.env.NEXT_PUBLIC_EMBED_TOKEN_REPOS,
  collaboration: process.env.NEXT_PUBLIC_EMBED_TOKEN_COLLABORATION,
  compare: process.env.NEXT_PUBLIC_EMBED_TOKEN_COMPARE,
  customer: process.env.NEXT_PUBLIC_EMBED_TOKEN_CUSTOMER,
  internal: process.env.NEXT_PUBLIC_EMBED_TOKEN_INTERNAL,
};

export function publicTokenForSlot(slot?: EmbedSlotId): string {
  const fromSlot = slot ? SLOT_PUBLIC_ENV[slot]?.trim() : "";
  return fromSlot || process.env.NEXT_PUBLIC_EMBED_TOKEN?.trim() || "";
}
