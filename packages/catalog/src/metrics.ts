export type MetricDefinition = {
  key: string;
  name: string;
  formula: string;
  source: string;
  /** Published governed member(s). Empty when nothing in the catalog answers it. */
  cubeMeasure: string;
  grain: string;
  inclusion: string;
};

export const LAUNCH_METRICS: MetricDefinition[] = [
  {
    key: "prs_merged",
    name: "PRs merged",
    formula: "count of pull requests where merged_at is not null",
    source: "pull_requests",
    cubeMeasure: "PullRequests.count over PullRequests.mergedAt",
    grain: "PR",
    inclusion: "merged_at is not null",
  },
  {
    key: "median_cycle_time",
    name: "Median PR cycle time",
    formula: "percentile_cont(0.5) of (merged_at - created_at) in hours",
    source: "pull_requests",
    cubeMeasure: "PullRequests.medianCycleHours",
    grain: "merged PR",
    inclusion: "merged_at is not null",
  },
  {
    key: "median_first_review",
    name: "Median time to first review",
    formula: "percentile_cont(0.5) of (first_review_at - created_at) in hours",
    source: "pull_requests",
    cubeMeasure: "PullRequests.medianFirstReviewHours",
    grain: "reviewed PR",
    inclusion: "first_review_at is not null",
  },
  {
    key: "active_contributors",
    name: "Active contributors",
    formula: "count distinct pull_requests.author_id",
    source: "pull_requests",
    cubeMeasure: "PullRequests.activeContributors",
    grain: "author in period",
    inclusion: "author_id is not null",
  },
  {
    key: "new_contributors",
    name: "New contributors",
    formula: "count distinct authors whose first PR in the org falls in the selected range",
    source: "pull_requests",
    cubeMeasure: "",
    grain: "author first-seen date",
    inclusion: "author_id is not null; no governed member records a first contribution date yet",
  },
  {
    key: "issues_resolved",
    name: "Issues resolved",
    formula: "count of issues where closed_at is not null",
    source: "issues",
    cubeMeasure: "Issues.count over Issues.closedAt",
    grain: "issue",
    inclusion: "closed_at is not null",
  },
  {
    key: "median_issue_resolution",
    name: "Median issue resolution",
    formula: "percentile_cont(0.5) of (closed_at - created_at) in hours",
    source: "issues",
    cubeMeasure: "Issues.medianResolutionHours",
    grain: "closed issue",
    inclusion: "closed_at is not null",
  },
  {
    key: "pr_size",
    name: "PR size",
    formula: "avg(coalesce(additions,0) + coalesce(deletions,0))",
    source: "pull_requests",
    cubeMeasure: "",
    grain: "PR",
    inclusion: "all PRs; no governed size measure is published",
  },
  {
    key: "bug_ratio",
    name: "Bug ratio",
    formula: "avg((is_bug)::int) — equivalent to bug issues / all issues",
    source: "issues",
    cubeMeasure: "Issues.count filtered on Issues.isBug, over Issues.count",
    grain: "issue",
    inclusion: "is_bug = true in numerator",
  },
  {
    key: "contributor_concentration",
    name: "Contributor concentration",
    formula: "share of PRs authored by the top 10 authors",
    source: "pull_requests",
    cubeMeasure: "PullRequests.count grouped by PullRequests.authorId, top 10 over total",
    grain: "org (range-scoped; non-additive)",
    inclusion: "created_at in the selected range; top 10 authors by PR count / all PRs in range",
  },
  {
    key: "last_ingest_at",
    name: "Last successful ingest",
    formula: "max(ingestion_runs.finished_at) where status = success",
    source: "ingestion_runs",
    cubeMeasure: "",
    grain: "pipeline",
    inclusion: "status = success; pipeline metadata, read from the warehouse rather than the catalog",
  },
];

export function getMetric(key: string): MetricDefinition | undefined {
  return LAUNCH_METRICS.find((metric) => metric.key === key);
}
