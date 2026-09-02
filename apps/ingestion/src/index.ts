import dns from "node:dns";
import { config, redactDatabaseUrl, requireGitHubToken } from "./config";
import { createPool, ensureSchema, pingDatabase } from "./db/pool";
import { GitHubClient } from "./github/client";
import { startHealthServer } from "./health";
import { runIngestion } from "./pipeline/ingest";
import { printQualityReport, runQualityChecks } from "./quality/checks";
import { sleep } from "./sleep";

dns.setDefaultResultOrder("ipv4first");

function args(): { loop: boolean; quality: boolean } {
  const argv = new Set(process.argv.slice(2));
  return { loop: argv.has("--loop"), quality: argv.has("--quality") };
}

async function runOnce(pool: ReturnType<typeof createPool>): Promise<void> {
  const token = requireGitHubToken();
  const github = new GitHubClient(token);
  await runIngestion(pool, github);
  const report = await runQualityChecks(pool);
  printQualityReport(report);
  if (!report.passed) {
    throw new Error("Quality checks failed");
  }
}

async function main(): Promise<void> {
  const { loop, quality } = args();
  const pool = createPool(config.databaseUrl);
  startHealthServer(pool, config.healthPort);

  const dbUp = await pingDatabase(pool);
  if (!dbUp) {
    throw new Error(`Postgres unreachable at ${redactDatabaseUrl(config.databaseUrl)}`);
  }
  await ensureSchema(pool);
  console.log(`Schema ready at ${redactDatabaseUrl(config.databaseUrl)}. Public Next.js traffic must never call GitHub.`);

  if (quality) {
    const report = await runQualityChecks(pool);
    printQualityReport(report);
    if (!report.passed) process.exitCode = 1;
    await pool.end();
    process.exit(process.exitCode ?? 0);
  }

  await runOnce(pool);

  if (!loop) {
    await pool.end();
    process.exit(0);
  }

  const intervalMs = config.intervalHours * 60 * 60 * 1000;
  console.log(`Scheduling next ingest in ${config.intervalHours}h`);
  for (;;) {
    await sleep(intervalMs);
    await runOnce(pool);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
