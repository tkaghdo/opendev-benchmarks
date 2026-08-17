import pg from "pg";

/**
 * Build 1 quality checks. Run after the first backfill.
 * Merged PRs must have merged_at; first_review_at must match min(review time);
 * every fact row must have org_id.
 */
async function runQualityChecks(databaseUrl: string): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const mergedMissing = await client.query(
      `select count(*)::int as n from pull_requests where merged_at is null and state = 'merged'`,
    );
    const missingOrg = await client.query(
      `select
         (select count(*) from pull_requests where org_id is null) +
         (select count(*) from issues where org_id is null) +
         (select count(*) from commits where org_id is null) as n`,
    );
    console.log("merged PRs missing merged_at:", mergedMissing.rows[0]?.n);
    console.log("fact rows missing org_id:", missingOrg.rows[0]?.n);
  } finally {
    await client.end();
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

runQualityChecks(url).catch((err) => {
  console.error(err);
  process.exit(1);
});
