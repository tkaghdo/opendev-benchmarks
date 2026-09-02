import { EmbedSlot } from "@/components/EmbedSlot";
import { embedConfig } from "@/lib/embedConfig";
import { publicTokenForSlot, type EmbedSlotId } from "@/lib/embedTokens";
import type { EmbedAudience, HostAppFilters } from "@/lib/hostFilters";

/** Server wrapper so EMBED_TOKEN is read at request time (no Next rebuild for the public token). */
export function DashboardEmbed(props: {
  audience: EmbedAudience;
  orgId?: string;
  filters?: HostAppFilters;
  label: string;
  slot?: EmbedSlotId;
}) {
  const embedToken = publicTokenForSlot(props.slot) || embedConfig().publicEmbedToken;
  return <EmbedSlot {...props} embedToken={embedToken} />;
}
