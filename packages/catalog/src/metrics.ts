export type MetricDefinition = {
  key: string;
  name: string;
  formula: string;
  source: string;
  cubeMeasure: string;
};

export const LAUNCH_METRICS: MetricDefinition[] = [
  {
    key: "prs_merged",
    name: "PRs merged",
    formula: "count of pull requests where merged_at is not null",
    source: "pull_requests",
    cubeMeasure: "pull_requests.merged_count",
  },
  {
    key: "median_cycle_time",
    name: "Median PR cycle time",
    formula: "median(merged_at - created_at) in hours, merged PRs only",
    source: "pull_requests",
    cubeMeasure: "pull_requests.median_cycle_time_hours",
  },
  {
    key: "median_first_review",
    name: "Median time to first review",
    formula: "median(first_review_at - created_at) in hours",
    source: "pull_requests",
    cubeMeasure: "pull_requests.median_time_to_first_review_hours",
  },
  {
    key: "active_contributors",
    name: "Active contributors",
    formula: "distinct contributors with activity in the selected period",
    source: "contributors",
    cubeMeasure: "contributors.active_contributors",
  },
  {
    key: "issues_resolved",
    name: "Issues resolved",
    formula: "count of issues where closed_at is not null",
    source: "issues",
    cubeMeasure: "issues.closed_count",
  },
  {
    key: "median_issue_resolution",
    name: "Median issue resolution",
    formula: "median(closed_at - created_at) in hours, closed issues only",
    source: "issues",
    cubeMeasure: "issues.median_resolution_time_hours",
  },
  {
    key: "pr_throughput",
    name: "PR throughput",
    formula: "merged PRs per week",
    source: "pull_requests",
    cubeMeasure: "pull_requests.merged_count",
  },
  {
    key: "pr_size",
    name: "PR size",
    formula: "additions + deletions",
    source: "pull_requests",
    cubeMeasure: "pull_requests.avg_pr_size",
  },
];
