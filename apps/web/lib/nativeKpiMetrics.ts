/**
 * Native KPI cards — Cube members rendered in OpenDev’s own UI (no iframe).
 *
 * After editing, rebuild: `pnpm --filter @opendev/web build`
 * then `sudo systemctl restart opendev-web`.
 *
 * Two ways to get a value:
 *
 * `preferred` uses an aggregate measure, so the card is ONE governed query.
 * That is the only shape that scales: every query costs two AWS SSM round
 * trips (~8-20s), and the fallback below has to page raw rows.
 *
 * The `percentile` / `distinctDimension` fields are the fallback for members
 * that are not in the published catalog yet. They download rows and compute
 * p50 in the BFF, which is capped and cannot cover large orgs.
 */
export type NativeKpiFormat = "count" | "hours" | "decimal" | "ratio" | "delta";

export type NativeKpiFilter = {
  member: string;
  operator: string;
  values?: string[];
};

/** Single-query shape. Used only when every `requires` member is published. */
export type NativeKpiPreferred = {
  measure: string;
  timeDimension?: string;
  /** Ratio cards fetch numerator and denominator as two measures in one query. */
  divideByMeasure?: string;
  requires: string[];
};

/**
 * Share of a measure held by the top N members of a dimension. Two aggregate
 * queries — an ordered top-N grouping plus the ungrouped total — so it stays
 * affordable even though it reports a distribution.
 */
export type NativeKpiTopShare = {
  measure: string;
  dimension: string;
  topN: number;
  timeDimension?: string;
};

/**
 * Share of a measure matching a filter, against the same measure unfiltered.
 * Two aggregate queries over one member, which is what a ratio needs when both
 * sides come from the same measure rather than two published measures.
 */
export type NativeKpiFilteredShare = {
  measure: string;
  filters: NativeKpiFilter[];
  timeDimension?: string;
};

/**
 * One governed metric minus another. Both operands go through the normal cache,
 * so a page already showing them pays nothing extra for the difference.
 */
export type NativeKpiDifference = {
  minuend: string;
  subtrahend: string;
};

export type NativeKpiMetricSpec = {
  enabled: boolean;
  format: NativeKpiFormat;
  lowerIsBetter?: boolean;
  preferred?: NativeKpiPreferred;
  topShare?: NativeKpiTopShare;
  filteredShare?: NativeKpiFilteredShare;
  difference?: NativeKpiDifference;
  measure?: string;
  timeDimension?: string;
  /** Applied only when the member is published; otherwise the card is all-time. */
  optionalTimeDimension?: string;
  distinctDimension?: string;
  percentile?: { start: string; end: string };
  divideByDistinct?: string;
  divideByTimeDimension?: string;
  filters?: NativeKpiFilter[];
  limit?: number;
};

export const NATIVE_KPI_METRICS: Record<string, NativeKpiMetricSpec> = {
  prs_created: {
    enabled: true,
    measure: "PullRequests.count",
    timeDimension: "PullRequests.createdAt",
    format: "count",
  },
  prs_merged: {
    enabled: true,
    measure: "PullRequests.count",
    timeDimension: "PullRequests.mergedAt",
    format: "count",
  },
  median_cycle_time: {
    enabled: true,
    format: "hours",
    lowerIsBetter: true,
    preferred: {
      measure: "PullRequests.medianCycleHours",
      timeDimension: "PullRequests.mergedAt",
      requires: ["PullRequests.medianCycleHours"],
    },
    measure: "PullRequests.count",
    timeDimension: "PullRequests.mergedAt",
    percentile: {
      start: "PullRequests.createdAt",
      end: "PullRequests.mergedAt",
    },
  },
  median_first_review: {
    enabled: true,
    format: "hours",
    lowerIsBetter: true,
    preferred: {
      measure: "PullRequests.medianFirstReviewHours",
      timeDimension: "PullRequests.createdAt",
      requires: ["PullRequests.medianFirstReviewHours"],
    },
    measure: "PullRequests.count",
    timeDimension: "PullRequests.createdAt",
    percentile: {
      start: "PullRequests.createdAt",
      end: "PullRequests.firstReviewAt",
    },
    filters: [{ member: "PullRequests.firstReviewAt", operator: "set" }],
  },
  active_contributors: {
    enabled: true,
    format: "count",
    preferred: {
      measure: "PullRequests.activeContributors",
      timeDimension: "PullRequests.createdAt",
      requires: ["PullRequests.activeContributors"],
    },
    distinctDimension: "PullRequests.authorId",
    timeDimension: "PullRequests.createdAt",
    filters: [{ member: "PullRequests.authorId", operator: "set" }],
  },
  prs_per_active: {
    enabled: true,
    format: "decimal",
    preferred: {
      measure: "PullRequests.count",
      divideByMeasure: "PullRequests.activeContributors",
      timeDimension: "PullRequests.createdAt",
      requires: ["PullRequests.activeContributors"],
    },
    measure: "PullRequests.count",
    timeDimension: "PullRequests.createdAt",
    divideByDistinct: "PullRequests.authorId",
    divideByTimeDimension: "PullRequests.createdAt",
    filters: [{ member: "PullRequests.authorId", operator: "set" }],
  },
  // Reported as above/below rather than better/worse: a high share is not
  // inherently bad, it just means activity is concentrated.
  contributor_concentration: {
    enabled: true,
    format: "ratio",
    topShare: {
      measure: "PullRequests.count",
      dimension: "PullRequests.authorId",
      topN: 10,
      timeDimension: "PullRequests.createdAt",
    },
  },
  issues_opened: {
    enabled: true,
    format: "count",
    measure: "Issues.count",
    timeDimension: "Issues.createdAt",
  },
  issues_resolved: {
    enabled: true,
    format: "count",
    measure: "Issues.count",
    timeDimension: "Issues.closedAt",
  },
  median_issue_resolution: {
    enabled: true,
    format: "hours",
    lowerIsBetter: true,
    preferred: {
      measure: "Issues.medianResolutionHours",
      timeDimension: "Issues.closedAt",
      requires: ["Issues.medianResolutionHours"],
    },
    measure: "Issues.count",
    timeDimension: "Issues.closedAt",
    percentile: {
      start: "Issues.createdAt",
      end: "Issues.closedAt",
    },
  },
  backlog_growth: {
    enabled: true,
    format: "delta",
    difference: { minuend: "issues_opened", subtrahend: "issues_resolved" },
  },
  open_backlog: {
    enabled: true,
    format: "count",
    // Point-in-time, so deliberately no time dimension: the backlog is what is
    // unclosed now, not what was unclosed during the range.
    measure: "Issues.count",
    filters: [{ member: "Issues.closedAt", operator: "notSet" }],
  },
  bug_ratio: {
    enabled: true,
    format: "ratio",
    filteredShare: {
      measure: "Issues.count",
      filters: [{ member: "Issues.isBug", operator: "equals", values: ["true"] }],
      timeDimension: "Issues.createdAt",
    },
  },
  commits: {
    enabled: true,
    format: "count",
    measure: "Commits.count",
    optionalTimeDimension: "Commits.committedAt",
  },
};

export function nativeKpiSpec(metricKey: string): NativeKpiMetricSpec | null {
  const spec = NATIVE_KPI_METRICS[metricKey];
  if (!spec?.enabled) return null;
  return spec;
}
