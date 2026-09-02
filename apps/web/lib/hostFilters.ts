import { type RangeDays } from "./range";

export type HostAppFilters = {
  dateFrom?: string;
  dateTo?: string;
  extra?: Record<string, string>;
};

export function rangeHostFilters(days: RangeDays, extra?: Record<string, string>): HostAppFilters {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    dateFrom: dateFrom.toISOString().slice(0, 10),
    dateTo: dateTo.toISOString().slice(0, 10),
    extra: extra && Object.keys(extra).length > 0 ? extra : undefined,
  };
}

export type EmbedAudience = "public" | "customer" | "internal";

export type ResolvedEmbedContext = {
  audience: EmbedAudience;
  customerId: string | null;
  skipTenantRls: boolean;
  filters: HostAppFilters;
  visibleOrgIds: string[];
  embedTokenPresent: boolean;
  configured: boolean;
};
