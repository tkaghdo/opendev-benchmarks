import { LAUNCH_ORGS } from "@opendev/catalog";
import { pingDatabase } from "./db/client";
import { GitHubClient } from "./github/client";

async function main() {
  console.log("OpenDev ingestion worker");
  console.log(`Launch orgs: ${LAUNCH_ORGS.map((org) => `${org.name} (${org.githubLogin})`).join(", ")}`);

  const databaseUrl = process.env.DATABASE_URL;
  const token = process.env.GITHUB_TOKEN;

  if (databaseUrl) {
    const ok = await pingDatabase(databaseUrl);
    console.log(ok ? "Postgres: reachable" : "Postgres: unreachable");
  } else {
    console.log("Postgres: DATABASE_URL not set");
  }

  const github = new GitHubClient(token);
  const remaining = await github.rateLimitRemaining();
  console.log(
    token
      ? `GitHub: token present${remaining != null ? `, remaining=${remaining}` : ""}`
      : "GitHub: GITHUB_TOKEN not set (required for Build 1 backfill)",
  );

  console.log(
    "Build 1 remaining: GraphQL PR/issue/review batching, idempotent upserts, incremental cursors, ingestion_runs, 12-month backfill.",
  );
  console.log("Do not call this worker from visitor page loads.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
