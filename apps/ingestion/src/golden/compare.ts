import { LAUNCH_ORGS } from "@opendev/catalog";
import pg from "pg";
import { config, redactDatabaseUrl } from "../config";
import { cubeJwt } from "./jwt";

const CUBE_ORIGIN = (process.env.CUBE_API_URL ?? "http://localhost:4000/cubejs-api/v1").replace(
  /\/cubejs-api\/v1\/?$/,
  "",
);
const CUBE_URL = `${CUBE_ORIGIN}/cubejs-api/v1`;
const CUBE_SECRET = process.env.CUBE_API_SECRET ?? process.env.CUBEJS_API_SECRET ?? "dev-cube-secret-change-me";

type PrSql = {
  org_id: string;
  merged_count: number;
  median_cycle_time_hours: number | null;
  median_time_to_first_review_hours: number | null;
  avg_pr_size: number | null;
  active_contributors: number;
};

type IssueSql = {
  org_id: string;
  closed_count: number;
  median_resolution_time_hours: number | null;
  bug_ratio: number | null;
};

type CountSql = { org_id: string; n: number };
type ShareSql = { org_id: string; top10_share: number | null };

const PR_SQL = `
select
  org_id,
  count(*) filter (where merged_at is not null)::int as merged_count,
  percentile_cont(0.5) within group (
    order by extract(epoch from (merged_at - created_at)) / 3600.0
  ) filter (where merged_at is not null) as median_cycle_time_hours,
  percentile_cont(0.5) within group (
    order by extract(epoch from (first_review_at - created_at)) / 3600.0
  ) filter (where first_review_at is not null) as median_time_to_first_review_hours,
  avg(coalesce(additions, 0) + coalesce(deletions, 0)) as avg_pr_size,
  count(distinct author_id) filter (where author_id is not null)::int as active_contributors
from pull_requests
group by org_id
`;

const ISSUES_SQL = `
select
  org_id,
  count(*) filter (where closed_at is not null)::int as closed_count,
  percentile_cont(0.5) within group (
    order by extract(epoch from (closed_at - created_at)) / 3600.0
  ) filter (where closed_at is not null) as median_resolution_time_hours,
  avg((is_bug)::int) as bug_ratio
from issues
group by org_id
`;

const NEW_CONTRIBUTORS_SQL = `
select org_id, count(*)::int as n
from (
  select org_id, author_id
  from pull_requests
  where author_id is not null
  group by org_id, author_id
) t
group by org_id
`;

const CONCENTRATION_SQL = `
with author_prs as (
  select org_id, author_id, count(*)::bigint as prs
  from pull_requests
  where author_id is not null
  group by org_id, author_id
),
ranked as (
  select org_id, author_id, prs,
    row_number() over (partition by org_id order by prs desc) as rn
  from author_prs
)
select
  org_id,
  sum(prs) filter (where rn <= 10)::float / nullif(sum(prs), 0) as top10_share
from ranked
group by org_id
`;

type CubeValue = number | string | null;

type CubeLoad = {
  ok: boolean;
  data: Array<Record<string, CubeValue>>;
  usedPreAggregations?: Record<string, unknown>;
  error?: string;
};

async function cubeLoad(token: string, query: Record<string, unknown>): Promise<CubeLoad> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${CUBE_URL}/load`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ query }),
    });
    const body = (await res.json()) as {
      data?: Array<Record<string, CubeValue>>;
      error?: string;
      usedPreAggregations?: Record<string, unknown>;
    };
    if (body.error && /continue wait/i.test(body.error)) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    if (!res.ok || body.error) {
      return { ok: false, data: [], error: body.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, data: body.data ?? [], usedPreAggregations: body.usedPreAggregations };
  }
  return { ok: false, data: [], error: "Cube continue wait timed out" };
}

function num(value: CubeValue | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTs(value: CubeValue | undefined): number | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  const iso = /Z|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function close(a: number | null, b: number | null, absTol: number, relTol: number): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const diff = Math.abs(a - b);
  return diff <= absTol || diff <= Math.abs(a) * relTol;
}

async function waitForCube(): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${CUBE_ORIGIN}/readyz`);
      if (res.ok) return;
    } catch {
      /* still booting */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Cube not ready at ${CUBE_ORIGIN}`);
}

function check(
  failures: { n: number },
  orgId: string,
  name: string,
  sqlValue: number | null,
  cubeValue: number | null,
  absTol: number,
  relTol: number,
): void {
  const ok = close(sqlValue, cubeValue, absTol, relTol);
  if (!ok) failures.n += 1;
  console.log(`${ok ? "OK" : "FAIL"} ${orgId} ${name} sql=${sqlValue ?? "null"} cube=${cubeValue ?? "null"}`);
}

async function main(): Promise<void> {
  console.log(`Warehouse ${redactDatabaseUrl(config.databaseUrl)}`);
  console.log(`Cube ${CUBE_URL}`);
  await waitForCube();

  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  const [prRows, issueRows, newRows, concRows, ingest] = await Promise.all([
    pool.query<PrSql>(PR_SQL),
    pool.query<IssueSql>(ISSUES_SQL),
    pool.query<CountSql>(NEW_CONTRIBUTORS_SQL),
    pool.query<ShareSql>(CONCENTRATION_SQL),
    pool.query<{ last_success_at: Date | null }>(
      `select max(finished_at) as last_success_at from ingestion_runs where status = 'success'`,
    ),
  ]);
  await pool.end();

  const publicToken = cubeJwt(CUBE_SECRET, { role: "public" });
  const emptyToken = cubeJwt(CUBE_SECRET, {});
  const vercelToken = cubeJwt(CUBE_SECRET, { org_id: "vercel" });

  const closed = await cubeLoad(emptyToken, { measures: ["pull_requests.merged_count"] });
  if (closed.ok) {
    throw new Error("Fail-closed check failed: empty security context was allowed");
  }
  console.log(`Fail-closed: ${closed.error}`);

  const freshness = await cubeLoad(publicToken, { measures: ["ingestion_runs.last_success_at"] });
  if (!freshness.ok) throw new Error(`Freshness query failed: ${freshness.error}`);
  const cubeFresh = freshness.data[0]?.["ingestion_runs.last_success_at"];
  const sqlFresh = ingest.rows[0]?.last_success_at;
  const sqlMs = sqlFresh ? sqlFresh.getTime() : null;
  const cubeMs = parseTs(cubeFresh);
  const freshOk = sqlMs != null && cubeMs != null && Math.abs(sqlMs - cubeMs) < 2000;
  console.log(
    `${freshOk ? "OK" : "FAIL"} last_ingest SQL=${sqlFresh?.toISOString() ?? "null"} Cube=${cubeFresh ?? "null"}`,
  );

  const failures = { n: freshOk ? 0 : 1 };

  for (const org of LAUNCH_ORGS) {
    const sqlPr = prRows.rows.find((row) => row.org_id === org.id);
    const sqlIssue = issueRows.rows.find((row) => row.org_id === org.id);
    const sqlNew = newRows.rows.find((row) => row.org_id === org.id);
    const sqlConc = concRows.rows.find((row) => row.org_id === org.id);
    if (!sqlPr) {
      console.log(`${org.id}: missing warehouse PR row`);
      failures.n += 1;
      continue;
    }

    const prCube = await cubeLoad(publicToken, {
      measures: [
        "pull_requests.merged_count",
        "pull_requests.median_cycle_time_hours",
        "pull_requests.median_time_to_first_review_hours",
        "pull_requests.avg_pr_size",
        "pull_requests.active_contributors",
      ],
      filters: [{ member: "pull_requests.orgId", operator: "equals", values: [org.id] }],
    });
    const issueCube = await cubeLoad(publicToken, {
      measures: ["issues.closed_count", "issues.median_resolution_time_hours", "issues.bug_ratio"],
      filters: [{ member: "issues.orgId", operator: "equals", values: [org.id] }],
    });
    const newCube = await cubeLoad(publicToken, {
      measures: ["contributor_first_seen.new_contributors"],
      filters: [{ member: "contributor_first_seen.orgId", operator: "equals", values: [org.id] }],
    });
    const concCube = await cubeLoad(publicToken, {
      measures: ["contributor_concentration.top10_share"],
      filters: [{ member: "contributor_concentration.orgId", operator: "equals", values: [org.id] }],
    });

    for (const [label, result] of [
      ["PRs", prCube],
      ["issues", issueCube],
      ["new contributors", newCube],
      ["concentration", concCube],
    ] as const) {
      if (!result.ok) {
        console.log(`${org.id}: Cube ${label} error ${result.error}`);
        failures.n += 1;
      }
    }

    const pr = prCube.data[0] ?? {};
    const issue = issueCube.data[0] ?? {};
    check(failures, org.id, "merged_count", sqlPr.merged_count, num(pr["pull_requests.merged_count"]), 0, 0);
    check(
      failures,
      org.id,
      "median_cycle_time_hours",
      sqlPr.median_cycle_time_hours,
      num(pr["pull_requests.median_cycle_time_hours"]),
      0.05,
      0.01,
    );
    check(
      failures,
      org.id,
      "median_time_to_first_review_hours",
      sqlPr.median_time_to_first_review_hours,
      num(pr["pull_requests.median_time_to_first_review_hours"]),
      0.05,
      0.01,
    );
    check(failures, org.id, "avg_pr_size", sqlPr.avg_pr_size, num(pr["pull_requests.avg_pr_size"]), 0.5, 0.01);
    check(
      failures,
      org.id,
      "active_contributors",
      sqlPr.active_contributors,
      num(pr["pull_requests.active_contributors"]),
      0,
      0,
    );
    check(failures, org.id, "closed_count", sqlIssue?.closed_count ?? 0, num(issue["issues.closed_count"]), 0, 0);
    check(
      failures,
      org.id,
      "median_resolution_time_hours",
      sqlIssue?.median_resolution_time_hours ?? null,
      num(issue["issues.median_resolution_time_hours"]),
      0.05,
      0.01,
    );
    check(failures, org.id, "bug_ratio", sqlIssue?.bug_ratio ?? null, num(issue["issues.bug_ratio"]), 0.002, 0.02);
    check(
      failures,
      org.id,
      "new_contributors",
      sqlNew?.n ?? 0,
      num(newCube.data[0]?.["contributor_first_seen.new_contributors"]),
      0,
      0,
    );
    check(
      failures,
      org.id,
      "top10_share",
      sqlConc?.top10_share ?? null,
      num(concCube.data[0]?.["contributor_concentration.top10_share"]),
      0.002,
      0.02,
    );
  }

  const tenant = await cubeLoad(vercelToken, {
    measures: ["pull_requests.merged_count"],
    dimensions: ["pull_requests.orgId"],
  });
  if (!tenant.ok) {
    console.log(`Tenant isolation Cube error: ${tenant.error}`);
    failures.n += 1;
  } else {
    const orgs = tenant.data.map((row) => row["pull_requests.orgId"]);
    const onlyVercel = orgs.length > 0 && orgs.every((id) => id === "vercel");
    if (!onlyVercel) {
      failures.n += 1;
      console.log(`FAIL tenant isolation, visible orgs: ${orgs.join(",")}`);
    } else {
      console.log("OK tenant isolation: vercel token sees only vercel");
    }
  }

  const preAgg = await cubeLoad(publicToken, {
    measures: ["pull_requests.merged_count"],
    timeDimensions: [
      { dimension: "pull_requests.createdAt", granularity: "day", dateRange: "last 365 days" },
    ],
    filters: [{ member: "pull_requests.orgId", operator: "equals", values: ["vercel"] }],
  });
  if (!preAgg.ok) {
    console.log(`FAIL daily pre-agg probe: ${preAgg.error}`);
    failures.n += 1;
  } else {
    const used = Object.keys(preAgg.usedPreAggregations ?? {});
    console.log(
      used.length > 0
        ? `OK daily pre-agg used: ${used.join(", ")}`
        : "WARN daily pre-agg not used yet (tables still building; additive query succeeded)",
    );
  }

  if (failures.n > 0) {
    throw new Error(`Golden suite failed (${failures.n} mismatches)`);
  }
  console.log("Golden suite PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
