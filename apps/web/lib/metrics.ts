import "server-only";

import { warehouseQuery } from "./warehouse";
import { type RangeDays } from "./range";

export type OrgSnapshot = {
  orgId: string;
  mergedCount: number;
  createdCount: number;
  medianCycleHours: number | null;
  medianFirstReviewHours: number | null;
  avgPrSize: number | null;
  activeContributors: number;
  newContributors: number;
  issuesOpened: number;
  issuesClosed: number;
  medianResolutionHours: number | null;
  bugRatio: number | null;
  openBacklog: number;
  commitCount: number;
  top10Share: number | null;
};

export type WeekPoint = {
  week: string;
  merged: number;
  created: number;
  medianCycleHours: number | null;
  commits: number;
  issuesOpened: number;
  issuesClosed: number;
};

export type RepoRow = {
  id: string;
  name: string;
  fullName: string;
  language: string | null;
  stars: number | null;
  mergedCount: number;
  medianCycleHours: number | null;
  medianFirstReviewHours: number | null;
  openBacklog: number;
  commitCount: number;
};

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function int(value: unknown): number {
  return Math.round(num(value) ?? 0);
}

export async function loadOrgSnapshots(days: RangeDays): Promise<OrgSnapshot[]> {
  const rows = await warehouseQuery<{
    org_id: string;
    merged_count: number;
    created_count: number;
    median_cycle_time_hours: string | number | null;
    median_time_to_first_review_hours: string | number | null;
    avg_pr_size: string | number | null;
    active_contributors: number;
    new_contributors: number;
    issues_opened: number;
    issues_closed: number;
    median_resolution_time_hours: string | number | null;
    bug_ratio: string | number | null;
    open_backlog: number;
    commit_count: number;
    top10_share: string | number | null;
  }>(
    `
    with since as (
      select now() - make_interval(days => $1::int) as ts
    ),
    pr as (
      select
        org_id,
        count(*) filter (
          where merged_at is not null and merged_at >= (select ts from since)
        )::int as merged_count,
        count(*) filter (
          where created_at >= (select ts from since)
        )::int as created_count,
        percentile_cont(0.5) within group (
          order by extract(epoch from (merged_at - created_at)) / 3600.0
        ) filter (
          where merged_at is not null and merged_at >= (select ts from since)
        ) as median_cycle_time_hours,
        percentile_cont(0.5) within group (
          order by extract(epoch from (first_review_at - created_at)) / 3600.0
        ) filter (
          where first_review_at is not null and created_at >= (select ts from since)
        ) as median_time_to_first_review_hours,
        avg(coalesce(additions, 0) + coalesce(deletions, 0)) filter (
          where created_at >= (select ts from since)
        ) as avg_pr_size,
        count(distinct author_id) filter (
          where author_id is not null and created_at >= (select ts from since)
        )::int as active_contributors
      from pull_requests
      group by org_id
    ),
    iss as (
      select
        org_id,
        count(*) filter (where created_at >= (select ts from since))::int as issues_opened,
        count(*) filter (where closed_at is not null and closed_at >= (select ts from since))::int as issues_closed,
        percentile_cont(0.5) within group (
          order by extract(epoch from (closed_at - created_at)) / 3600.0
        ) filter (
          where closed_at is not null and closed_at >= (select ts from since)
        ) as median_resolution_time_hours,
        avg((is_bug)::int) filter (where created_at >= (select ts from since)) as bug_ratio,
        count(*) filter (where closed_at is null)::int as open_backlog
      from issues
      group by org_id
    ),
    cmt as (
      select org_id, count(*)::int as commit_count
      from commits
      where committed_at >= (select ts from since)
      group by org_id
    ),
    first_seen as (
      select org_id, author_id, min(created_at) as first_at
      from pull_requests
      where author_id is not null
      group by org_id, author_id
    ),
    new_c as (
      select org_id, count(*)::int as new_contributors
      from first_seen
      where first_at >= (select ts from since)
      group by org_id
    ),
    author_prs as (
      select org_id, author_id, count(*)::bigint as prs
      from pull_requests
      where author_id is not null and created_at >= (select ts from since)
      group by org_id, author_id
    ),
    ranked as (
      select org_id, prs, row_number() over (partition by org_id order by prs desc) as rn
      from author_prs
    ),
    conc as (
      select
        org_id,
        sum(prs) filter (where rn <= 10)::double precision / nullif(sum(prs), 0) as top10_share
      from ranked
      group by org_id
    )
    select
      o.id as org_id,
      coalesce(pr.merged_count, 0) as merged_count,
      coalesce(pr.created_count, 0) as created_count,
      pr.median_cycle_time_hours,
      pr.median_time_to_first_review_hours,
      pr.avg_pr_size,
      coalesce(pr.active_contributors, 0) as active_contributors,
      coalesce(new_c.new_contributors, 0) as new_contributors,
      coalesce(iss.issues_opened, 0) as issues_opened,
      coalesce(iss.issues_closed, 0) as issues_closed,
      iss.median_resolution_time_hours,
      iss.bug_ratio,
      coalesce(iss.open_backlog, 0) as open_backlog,
      coalesce(cmt.commit_count, 0) as commit_count,
      conc.top10_share
    from orgs o
    left join pr on pr.org_id = o.id
    left join iss on iss.org_id = o.id
    left join cmt on cmt.org_id = o.id
    left join new_c on new_c.org_id = o.id
    left join conc on conc.org_id = o.id
    order by o.name
    `,
    [days],
  );

  return rows.map((row) => ({
    orgId: row.org_id,
    mergedCount: int(row.merged_count),
    createdCount: int(row.created_count),
    medianCycleHours: num(row.median_cycle_time_hours),
    medianFirstReviewHours: num(row.median_time_to_first_review_hours),
    avgPrSize: num(row.avg_pr_size),
    activeContributors: int(row.active_contributors),
    newContributors: int(row.new_contributors),
    issuesOpened: int(row.issues_opened),
    issuesClosed: int(row.issues_closed),
    medianResolutionHours: num(row.median_resolution_time_hours),
    bugRatio: num(row.bug_ratio),
    openBacklog: int(row.open_backlog),
    commitCount: int(row.commit_count),
    top10Share: num(row.top10_share),
  }));
}

export function prsPerActive(snapshot: OrgSnapshot): number | null {
  if (snapshot.activeContributors <= 0) return null;
  return snapshot.mergedCount / snapshot.activeContributors;
}

export function backlogGrowth(snapshot: OrgSnapshot): number {
  return snapshot.issuesOpened - snapshot.issuesClosed;
}

export async function loadWeeklySeries(orgId: string, days: RangeDays): Promise<WeekPoint[]> {
  return warehouseQuery<{
    week: Date;
    merged: number;
    created: number;
    median_cycle_time_hours: string | number | null;
    commits: number;
    issues_opened: number;
    issues_closed: number;
  }>(
    `
    with since as (
      select now() - make_interval(days => $2::int) as ts
    ),
    weeks as (
      select generate_series(
        date_trunc('week', (select ts from since)),
        date_trunc('week', now()),
        interval '1 week'
      )::date as week
    ),
    pr_created as (
      select date_trunc('week', created_at)::date as week, count(*)::int as created
      from pull_requests
      where org_id = $1 and created_at >= (select ts from since)
      group by 1
    ),
    pr_merged as (
      select
        date_trunc('week', merged_at)::date as week,
        count(*)::int as merged,
        percentile_cont(0.5) within group (
          order by extract(epoch from (merged_at - created_at)) / 3600.0
        ) as median_cycle_time_hours
      from pull_requests
      where org_id = $1 and merged_at is not null and merged_at >= (select ts from since)
      group by 1
    ),
    cmt as (
      select date_trunc('week', committed_at)::date as week, count(*)::int as commits
      from commits
      where org_id = $1 and committed_at >= (select ts from since)
      group by 1
    ),
    iss_opened as (
      select date_trunc('week', created_at)::date as week, count(*)::int as issues_opened
      from issues
      where org_id = $1 and created_at >= (select ts from since)
      group by 1
    ),
    iss_closed as (
      select date_trunc('week', closed_at)::date as week, count(*)::int as issues_closed
      from issues
      where org_id = $1 and closed_at is not null and closed_at >= (select ts from since)
      group by 1
    )
    select
      w.week,
      coalesce(pr_merged.merged, 0) as merged,
      coalesce(pr_created.created, 0) as created,
      pr_merged.median_cycle_time_hours,
      coalesce(cmt.commits, 0) as commits,
      coalesce(iss_opened.issues_opened, 0) as issues_opened,
      coalesce(iss_closed.issues_closed, 0) as issues_closed
    from weeks w
    left join pr_created on pr_created.week = w.week
    left join pr_merged on pr_merged.week = w.week
    left join cmt on cmt.week = w.week
    left join iss_opened on iss_opened.week = w.week
    left join iss_closed on iss_closed.week = w.week
    order by w.week
    `,
    [orgId, days],
  ).then((rows) =>
    rows.map((row) => ({
      week: new Date(row.week).toISOString().slice(0, 10),
      merged: int(row.merged),
      created: int(row.created),
      medianCycleHours: num(row.median_cycle_time_hours),
      commits: int(row.commits),
      issuesOpened: int(row.issues_opened),
      issuesClosed: int(row.issues_closed),
    })),
  );
}

export async function loadRepoRows(orgId: string, days: RangeDays): Promise<RepoRow[]> {
  const rows = await warehouseQuery<{
    id: string;
    name: string;
    full_name: string;
    language: string | null;
    stars: number | null;
    merged_count: number;
    median_cycle_time_hours: string | number | null;
    median_time_to_first_review_hours: string | number | null;
    open_backlog: number;
    commit_count: number;
  }>(
    `
    with since as (
      select now() - make_interval(days => $2::int) as ts
    )
    select
      r.id::text as id,
      r.name,
      r.full_name,
      r.language,
      r.stars,
      count(pr.id) filter (
        where pr.merged_at is not null and pr.merged_at >= (select ts from since)
      )::int as merged_count,
      percentile_cont(0.5) within group (
        order by extract(epoch from (pr.merged_at - pr.created_at)) / 3600.0
      ) filter (
        where pr.merged_at is not null and pr.merged_at >= (select ts from since)
      ) as median_cycle_time_hours,
      percentile_cont(0.5) within group (
        order by extract(epoch from (pr.first_review_at - pr.created_at)) / 3600.0
      ) filter (
        where pr.first_review_at is not null and pr.created_at >= (select ts from since)
      ) as median_time_to_first_review_hours,
      (
        select count(*)::int from issues i
        where i.repo_id = r.id and i.closed_at is null
      ) as open_backlog,
      (
        select count(*)::int from commits c
        where c.repo_id = r.id and c.committed_at >= (select ts from since)
      ) as commit_count
    from repos r
    left join pull_requests pr on pr.repo_id = r.id
    where r.org_id = $1 and coalesce(r.is_private, false) = false
    group by r.id
    order by r.stars desc nulls last, r.name
    `,
    [orgId, days],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    language: row.language,
    stars: num(row.stars),
    mergedCount: int(row.merged_count),
    medianCycleHours: num(row.median_cycle_time_hours),
    medianFirstReviewHours: num(row.median_time_to_first_review_hours),
    openBacklog: int(row.open_backlog),
    commitCount: int(row.commit_count),
  }));
}

export async function loadCycleOverlay(
  orgIds: [string, string],
  days: RangeDays = 365,
): Promise<Array<{ week: string; left: number | null; right: number | null }>> {
  const rows = await warehouseQuery<{
    week: Date;
    org_id: string;
    median_cycle_time_hours: string | number | null;
  }>(
    `
    with since as (
      select now() - make_interval(days => $2::int) as ts
    ),
    weeks as (
      select generate_series(
        date_trunc('week', (select ts from since)),
        date_trunc('week', now()),
        interval '1 week'
      )::date as week
    ),
    pr as (
      select
        org_id,
        date_trunc('week', merged_at)::date as week,
        percentile_cont(0.5) within group (
          order by extract(epoch from (merged_at - created_at)) / 3600.0
        ) as median_cycle_time_hours
      from pull_requests
      where org_id = any($1::text[])
        and merged_at is not null
        and merged_at >= (select ts from since)
      group by org_id, 2
    )
    select w.week, o.org_id, pr.median_cycle_time_hours
    from weeks w
    cross join unnest($1::text[]) as o(org_id)
    left join pr on pr.week = w.week and pr.org_id = o.org_id
    order by w.week, o.org_id
    `,
    [orgIds, days],
  );

  const byWeek = new Map<string, { week: string; left: number | null; right: number | null }>();
  for (const row of rows) {
    const week = new Date(row.week).toISOString().slice(0, 10);
    const current = byWeek.get(week) ?? { week, left: null, right: null };
    const value = num(row.median_cycle_time_hours);
    if (row.org_id === orgIds[0]) current.left = value;
    if (row.org_id === orgIds[1]) current.right = value;
    byWeek.set(week, current);
  }
  return [...byWeek.values()];
}

export function medianOf(values: Array<number | null>): number | null {
  const nums = values.filter((value): value is number => value != null && Number.isFinite(value)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
}
