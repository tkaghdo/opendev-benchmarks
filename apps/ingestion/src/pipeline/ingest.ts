import { LAUNCH_ORGS, type LaunchOrg } from "@opendev/catalog";
import type pg from "pg";
import { config, lookbackCutoff } from "../config";
import { finishRun, startRun } from "../db/runs";
import {
  addCounts,
  emptyCounts,
  getCursor,
  getRepoIngestState,
  markRepoIngested,
  saveCursor,
  totalRows,
  upsertCommits,
  upsertIssues,
  upsertOrg,
  upsertPullRequests,
  upsertRepo,
  type RowCounts,
} from "../db/upserts";
import { GitHubClient } from "../github/client";
import { selectUpdatedInWindow } from "../github/window";
import { iso } from "../sleep";

export type IngestResult = {
  rows: RowCounts;
  skippedRepos: string[];
};

async function withTransaction<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const value = await fn(client);
    await client.query("commit");
    return value;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function ingestPagedWindow<T extends { updatedAt: string }>(input: {
  pool: pg.Pool;
  github: GitHubClient;
  org: LaunchOrg;
  repoId: number;
  repoName: string;
  entity: "pull_requests" | "issues";
  cutoff: Date;
  lastIngestedAt: Date | null;
  fetchPage: (
    cursor: string | null,
  ) => Promise<{ nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }>;
  write: (client: pg.PoolClient, nodes: T[]) => Promise<RowCounts>;
}): Promise<RowCounts> {
  const counts = emptyCounts();
  let cursor = await getCursor(input.pool, input.repoId, input.entity);
  for (let page = 0; page < config.maxPages; page += 1) {
    const { nodes, pageInfo } = await input.fetchPage(cursor);
    const { inWindow, reachedEnd } = selectUpdatedInWindow(nodes, input.cutoff, input.lastIngestedAt);
    if (inWindow.length) {
      const delta = await withTransaction(input.pool, (client) => input.write(client, inWindow));
      addCounts(counts, delta);
    }
    const nextCursor = reachedEnd || !pageInfo.hasNextPage ? null : pageInfo.endCursor;
    await saveCursor(input.pool, input.repoId, input.entity, nextCursor);
    console.log(
      `  ${input.org.id}/${input.repoName} ${input.entity} page ${page + 1}: +${inWindow.length} (remaining=${input.github.remaining})`,
    );
    if (reachedEnd || !pageInfo.hasNextPage) break;
    cursor = nextCursor;
  }
  return counts;
}

async function ingestCommits(input: {
  pool: pg.Pool;
  github: GitHubClient;
  org: LaunchOrg;
  owner: string;
  repoName: string;
  repoId: number;
  since: Date;
}): Promise<RowCounts> {
  const counts = emptyCounts();
  let cursor = await getCursor(input.pool, input.repoId, "commits");
  for (let page = 0; page < config.maxPages; page += 1) {
    const { nodes, pageInfo } = await input.github.commits(
      input.owner,
      input.repoName,
      cursor,
      config.pageSize,
      iso(input.since),
    );
    if (nodes.length) {
      const delta = await withTransaction(input.pool, (client) =>
        upsertCommits(client, input.org.id, input.repoId, nodes),
      );
      addCounts(counts, delta);
    }
    const nextCursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    await saveCursor(input.pool, input.repoId, "commits", nextCursor);
    console.log(
      `  ${input.org.id}/${input.repoName} commits page ${page + 1}: +${nodes.length} (remaining=${input.github.remaining})`,
    );
    if (!pageInfo.hasNextPage) break;
    cursor = nextCursor;
  }
  return counts;
}

async function ingestRepo(
  pool: pg.Pool,
  github: GitHubClient,
  org: LaunchOrg,
  repoName: string,
  cutoff: Date,
): Promise<{ counts: RowCounts; skipped: boolean }> {
  const counts = emptyCounts();
  const meta = await github.repoMeta(org.githubLogin, repoName);
  if (!meta) {
    console.log(`  skip ${org.githubLogin}/${repoName}: not found`);
    return { counts, skipped: true };
  }
  if (meta.isPrivate) {
    console.log(`  skip ${meta.nameWithOwner}: private`);
    return { counts, skipped: true };
  }

  await upsertRepo(pool, org.id, meta);
  counts.repos += 1;

  const { lastIngestedAt } = await getRepoIngestState(pool, meta.databaseId);
  const githubUpdatedAt = new Date(meta.updatedAt);
  if (lastIngestedAt && githubUpdatedAt <= lastIngestedAt) {
    console.log(`  skip ${meta.nameWithOwner}: unchanged since ${lastIngestedAt.toISOString()}`);
    await markRepoIngested(pool, meta.databaseId);
    return { counts, skipped: true };
  }

  const prs = await ingestPagedWindow({
    pool,
    github,
    org,
    repoId: meta.databaseId,
    repoName,
    entity: "pull_requests",
    cutoff,
    lastIngestedAt,
    fetchPage: (cursor) => github.pullRequests(org.githubLogin, repoName, cursor, config.pageSize),
    write: (client, nodes) => upsertPullRequests(client, org.id, meta.databaseId, nodes),
  });
  addCounts(counts, prs);

  const issues = await ingestPagedWindow({
    pool,
    github,
    org,
    repoId: meta.databaseId,
    repoName,
    entity: "issues",
    cutoff,
    lastIngestedAt,
    fetchPage: (cursor) => github.issues(org.githubLogin, repoName, cursor, config.pageSize),
    write: (client, nodes) => upsertIssues(client, org.id, meta.databaseId, nodes),
  });
  addCounts(counts, issues);

  const since = lastIngestedAt && lastIngestedAt > cutoff ? lastIngestedAt : cutoff;
  const commits = await ingestCommits({
    pool,
    github,
    org,
    owner: org.githubLogin,
    repoName,
    repoId: meta.databaseId,
    since,
  });
  addCounts(counts, commits);

  await markRepoIngested(pool, meta.databaseId);
  return { counts, skipped: false };
}

export async function runIngestion(pool: pg.Pool, github: GitHubClient): Promise<IngestResult> {
  const cutoff = lookbackCutoff();
  const rows = emptyCounts();
  const skippedRepos: string[] = [];
  const runId = await startRun(pool);
  console.log(`Ingestion run ${runId}; lookback ${config.lookbackDays}d from ${cutoff.toISOString()}`);

  try {
    for (const org of LAUNCH_ORGS) {
      let createdAt: string | null = null;
      let avatarUrl: string | null = org.avatarUrl;
      try {
        const restOrg = await github.org(org.githubLogin);
        createdAt = restOrg.created_at;
        avatarUrl = restOrg.avatar_url ?? org.avatarUrl;
      } catch (err) {
        console.log(`  org REST ${org.githubLogin} failed: ${err instanceof Error ? err.message : err}`);
      }
      await upsertOrg(pool, org, { createdAt, avatarUrl });
      rows.orgs += 1;

      for (const repoName of org.repos) {
        const result = await ingestRepo(pool, github, org, repoName, cutoff);
        addCounts(rows, result.counts);
        if (result.skipped) skippedRepos.push(`${org.githubLogin}/${repoName}`);
      }
    }

    await finishRun(pool, runId, {
      status: "success",
      rowsUpserted: totalRows(rows),
      githubRemaining: github.remaining,
    });
    console.log(`Run ${runId} success; upserted ${totalRows(rows)}; GitHub remaining=${github.remaining}`);
    return { rows, skippedRepos };
  } catch (err) {
    await finishRun(pool, runId, {
      status: "failed",
      rowsUpserted: totalRows(rows),
      githubRemaining: github.remaining,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
