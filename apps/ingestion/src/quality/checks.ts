import type pg from "pg";

export type QualityReport = {
  passed: boolean;
  mergedMissingMergedAt: number;
  firstReviewMismatch: number;
  factsMissingOrgId: number;
  privateRepos: number;
  totals: {
    orgs: number;
    repos: number;
    pull_requests: number;
    issues: number;
    commits: number;
    reviews: number;
  };
};

export async function runQualityChecks(pool: pg.Pool): Promise<QualityReport> {
  const mergedMissing = await pool.query<{ n: number }>(
    `select count(*)::int as n from pull_requests where merged_at is null and state = 'merged'`,
  );
  const firstReview = await pool.query<{ n: number }>(
    `select count(*)::int as n
     from pull_requests pr
     join (
       select pull_request_id, min(submitted_at) as first_at
       from reviews
       where submitted_at is not null
       group by pull_request_id
     ) r on r.pull_request_id = pr.id
     where pr.first_review_at is distinct from r.first_at`,
  );
  const missingOrg = await pool.query<{ n: number }>(
    `select
       (select count(*) from pull_requests where org_id is null)::int +
       (select count(*) from issues where org_id is null)::int +
       (select count(*) from commits where org_id is null)::int as n`,
  );
  const privateRepos = await pool.query<{ n: number }>(
    `select count(*)::int as n from repos where is_private = true`,
  );
  const totals = await pool.query<{
    orgs: number;
    repos: number;
    pull_requests: number;
    issues: number;
    commits: number;
    reviews: number;
  }>(
    `select
       (select count(*) from orgs)::int as orgs,
       (select count(*) from repos)::int as repos,
       (select count(*) from pull_requests)::int as pull_requests,
       (select count(*) from issues)::int as issues,
       (select count(*) from commits)::int as commits,
       (select count(*) from reviews)::int as reviews`,
  );

  const report: QualityReport = {
    passed: false,
    mergedMissingMergedAt: mergedMissing.rows[0]?.n ?? 0,
    firstReviewMismatch: firstReview.rows[0]?.n ?? 0,
    factsMissingOrgId: missingOrg.rows[0]?.n ?? 0,
    privateRepos: privateRepos.rows[0]?.n ?? 0,
    totals: totals.rows[0],
  };
  report.passed =
    report.mergedMissingMergedAt === 0 &&
    report.firstReviewMismatch === 0 &&
    report.factsMissingOrgId === 0 &&
    report.privateRepos === 0 &&
    report.totals.orgs >= 5 &&
    report.totals.repos >= 5 &&
    report.totals.pull_requests > 0 &&
    report.totals.issues > 0 &&
    report.totals.commits > 0;
  return report;
}

export function printQualityReport(report: QualityReport): void {
  console.log("Quality checks");
  console.log(`  merged PRs missing merged_at: ${report.mergedMissingMergedAt}`);
  console.log(`  first_review_at mismatch: ${report.firstReviewMismatch}`);
  console.log(`  fact rows missing org_id: ${report.factsMissingOrgId}`);
  console.log(`  private repos: ${report.privateRepos}`);
  console.log(
    `  totals: orgs=${report.totals.orgs} repos=${report.totals.repos} prs=${report.totals.pull_requests} issues=${report.totals.issues} commits=${report.totals.commits} reviews=${report.totals.reviews}`,
  );
  console.log(report.passed ? "  PASS" : "  FAIL");
}
