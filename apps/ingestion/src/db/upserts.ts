import type { LaunchOrg } from "@opendev/catalog";
import type pg from "pg";
import type { Actor, CommitNode, IssueNode, PullRequestNode, RepoMeta } from "../github/types";

export type RowCounts = {
  orgs: number;
  repos: number;
  contributors: number;
  pull_requests: number;
  reviews: number;
  issues: number;
  commits: number;
};

export function emptyCounts(): RowCounts {
  return {
    orgs: 0,
    repos: 0,
    contributors: 0,
    pull_requests: 0,
    reviews: 0,
    issues: 0,
    commits: 0,
  };
}

export function totalRows(counts: RowCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

function addCounts(target: RowCounts, delta: Partial<RowCounts>): void {
  for (const [key, value] of Object.entries(delta) as Array<[keyof RowCounts, number]>) {
    if (value) target[key] += value;
  }
}

function actorId(actor: Actor): number | null {
  const id = actor?.databaseId;
  return typeof id === "number" && Number.isFinite(id) ? id : null;
}

export async function upsertContributor(
  client: pg.PoolClient,
  orgId: string,
  actor: Actor,
): Promise<number | null> {
  const id = actorId(actor);
  const login = actor?.login?.trim();
  if (id == null || !login) return null;
  await client.query(
    `insert into contributors (id, login, org_id)
     values ($1, $2, $3)
     on conflict (id) do update set login = excluded.login, org_id = excluded.org_id`,
    [id, login, orgId],
  );
  return id;
}

export async function upsertOrg(
  client: pg.Pool | pg.PoolClient,
  org: LaunchOrg,
  extra: { createdAt?: string | null; avatarUrl?: string | null },
): Promise<void> {
  await client.query(
    `insert into orgs (id, name, github_login, avatar_url, created_at)
     values ($1, $2, $3, $4, $5)
     on conflict (id) do update set
       name = excluded.name,
       github_login = excluded.github_login,
       avatar_url = coalesce(excluded.avatar_url, orgs.avatar_url),
       created_at = coalesce(excluded.created_at, orgs.created_at)`,
    [org.id, org.name, org.githubLogin, extra.avatarUrl ?? org.avatarUrl, extra.createdAt ?? null],
  );
}

export async function upsertRepo(
  client: pg.Pool | pg.PoolClient,
  orgId: string,
  meta: RepoMeta,
): Promise<void> {
  await client.query(
    `insert into repos (id, org_id, name, full_name, is_private, stars, language, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (id) do update set
       org_id = excluded.org_id,
       name = excluded.name,
       full_name = excluded.full_name,
       is_private = excluded.is_private,
       stars = excluded.stars,
       language = excluded.language,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
    [
      meta.databaseId,
      orgId,
      meta.name,
      meta.nameWithOwner,
      meta.isPrivate,
      meta.stargazerCount,
      meta.primaryLanguage?.name ?? null,
      meta.createdAt,
      meta.updatedAt,
    ],
  );
}

export async function markRepoIngested(client: pg.Pool | pg.PoolClient, repoId: number): Promise<void> {
  await client.query(`update repos set last_ingested_at = now() where id = $1`, [repoId]);
}

export async function getRepoIngestState(
  client: pg.Pool | pg.PoolClient,
  repoId: number,
): Promise<{ lastIngestedAt: Date | null }> {
  const result = await client.query<{ last_ingested_at: Date | null }>(
    `select last_ingested_at from repos where id = $1`,
    [repoId],
  );
  return { lastIngestedAt: result.rows[0]?.last_ingested_at ?? null };
}

export async function getCursor(
  client: pg.Pool | pg.PoolClient,
  repoId: number,
  entity: string,
): Promise<string | null> {
  const result = await client.query<{ cursor: string | null }>(
    `select cursor from ingest_cursors where repo_id = $1 and entity = $2`,
    [repoId, entity],
  );
  return result.rows[0]?.cursor ?? null;
}

export async function saveCursor(
  client: pg.Pool | pg.PoolClient,
  repoId: number,
  entity: string,
  cursor: string | null,
): Promise<void> {
  await client.query(
    `insert into ingest_cursors (repo_id, entity, cursor, updated_at)
     values ($1, $2, $3, now())
     on conflict (repo_id, entity) do update set cursor = excluded.cursor, updated_at = now()`,
    [repoId, entity, cursor],
  );
}

export async function upsertPullRequests(
  client: pg.PoolClient,
  orgId: string,
  repoId: number,
  nodes: PullRequestNode[],
): Promise<RowCounts> {
  const counts = emptyCounts();
  for (const node of nodes) {
    if (node.databaseId == null) continue;
    const authorId = await upsertContributor(client, orgId, node.author);
    if (authorId) counts.contributors += 1;

    const reviews = (node.reviews?.nodes ?? []).filter((review) => review?.databaseId != null);
    const firstReviewAt = reviews
      .map((review) => review?.submittedAt)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;

    await client.query(
      `insert into pull_requests (
         id, repo_id, org_id, author_id, number, state,
         created_at, merged_at, closed_at, first_review_at,
         additions, deletions, changed_files, github_updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (id) do update set
         repo_id = excluded.repo_id,
         org_id = excluded.org_id,
         author_id = excluded.author_id,
         number = excluded.number,
         state = excluded.state,
         created_at = excluded.created_at,
         merged_at = excluded.merged_at,
         closed_at = excluded.closed_at,
         first_review_at = excluded.first_review_at,
         additions = excluded.additions,
         deletions = excluded.deletions,
         changed_files = excluded.changed_files,
         github_updated_at = excluded.github_updated_at`,
      [
        node.databaseId,
        repoId,
        orgId,
        authorId,
        node.number,
        node.state.toLowerCase(),
        node.createdAt,
        node.mergedAt,
        node.closedAt,
        firstReviewAt,
        node.additions,
        node.deletions,
        node.changedFiles,
        node.updatedAt,
      ],
    );
    counts.pull_requests += 1;

    for (const review of reviews) {
      if (!review?.databaseId) continue;
      const reviewerId = await upsertContributor(client, orgId, review.author);
      if (reviewerId) counts.contributors += 1;
      await client.query(
        `insert into reviews (id, pull_request_id, reviewer_id, state, submitted_at)
         values ($1, $2, $3, $4, $5)
         on conflict (id) do update set
           pull_request_id = excluded.pull_request_id,
           reviewer_id = excluded.reviewer_id,
           state = excluded.state,
           submitted_at = excluded.submitted_at`,
        [review.databaseId, node.databaseId, reviewerId, review.state.toLowerCase(), review.submittedAt],
      );
      counts.reviews += 1;
    }
  }
  return counts;
}

export async function upsertIssues(
  client: pg.PoolClient,
  orgId: string,
  repoId: number,
  nodes: IssueNode[],
): Promise<RowCounts> {
  const counts = emptyCounts();
  for (const node of nodes) {
    if (node.databaseId == null) continue;
    const authorId = await upsertContributor(client, orgId, node.author);
    if (authorId) counts.contributors += 1;
    const isBug = (node.labels?.nodes ?? []).some((label) => label?.name.toLowerCase().includes("bug"));
    await client.query(
      `insert into issues (
         id, repo_id, org_id, author_id, number, state, created_at, closed_at, is_bug
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) do update set
         repo_id = excluded.repo_id,
         org_id = excluded.org_id,
         author_id = excluded.author_id,
         number = excluded.number,
         state = excluded.state,
         created_at = excluded.created_at,
         closed_at = excluded.closed_at,
         is_bug = excluded.is_bug`,
      [
        node.databaseId,
        repoId,
        orgId,
        authorId,
        node.number,
        node.state.toLowerCase(),
        node.createdAt,
        node.closedAt,
        isBug,
      ],
    );
    counts.issues += 1;
  }
  return counts;
}

export async function upsertCommits(
  client: pg.PoolClient,
  orgId: string,
  repoId: number,
  nodes: CommitNode[],
): Promise<RowCounts> {
  const counts = emptyCounts();
  for (const node of nodes) {
    const authorId = await upsertContributor(client, orgId, node.author?.user ?? null);
    if (authorId) counts.contributors += 1;
    await client.query(
      `insert into commits (sha, repo_id, org_id, author_id, committed_at, additions, deletions)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (sha) do update set
         repo_id = excluded.repo_id,
         org_id = excluded.org_id,
         author_id = excluded.author_id,
         committed_at = excluded.committed_at,
         additions = excluded.additions,
         deletions = excluded.deletions`,
      [node.oid, repoId, orgId, authorId, node.committedDate, node.additions, node.deletions],
    );
    counts.commits += 1;
  }
  return counts;
}

export { addCounts };
