import "server-only";

import pg from "pg";
import { warehouseUrl } from "./env";

const globalForPg = globalThis as unknown as { opendevPool?: pg.Pool };

function getPool(): pg.Pool {
  if (!globalForPg.opendevPool) {
    globalForPg.opendevPool = new pg.Pool({
      connectionString: warehouseUrl(),
      max: 4,
    });
  }
  return globalForPg.opendevPool;
}

export async function warehouseQuery<T extends pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const { rows } = await getPool().query<T>(text, values);
  return rows;
}

export type WarehouseOrg = {
  id: string;
  name: string;
  githubLogin: string;
  avatarUrl: string | null;
  repoCount: number;
};

export type WarehouseRepo = {
  id: string;
  orgId: string;
  name: string;
  fullName: string;
  language: string | null;
  stars: number | null;
};

export type WarehouseFreshness = {
  available: boolean;
  lastSuccessAt: Date | null;
  lagging: boolean;
};

const LAG_MS = 8 * 60 * 60 * 1000;

export async function getFreshness(): Promise<WarehouseFreshness> {
  try {
    const { rows } = await getPool().query<{ last_success_at: Date | null }>(
      `select max(finished_at) as last_success_at from ingestion_runs where status = 'success'`,
    );
    const lastSuccessAt = rows[0]?.last_success_at ?? null;
    const lagging = !lastSuccessAt || Date.now() - lastSuccessAt.getTime() > LAG_MS;
    return { available: true, lastSuccessAt, lagging };
  } catch {
    return { available: false, lastSuccessAt: null, lagging: true };
  }
}

export async function listOrgs(): Promise<WarehouseOrg[]> {
  const { rows } = await getPool().query<{
    id: string;
    name: string;
    github_login: string;
    avatar_url: string | null;
    repo_count: number;
  }>(`
    select
      o.id,
      o.name,
      o.github_login,
      o.avatar_url,
      count(r.id)::int as repo_count
    from orgs o
    left join repos r on r.org_id = o.id and coalesce(r.is_private, false) = false
    group by o.id
    order by o.name
  `);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    githubLogin: row.github_login,
    avatarUrl: row.avatar_url,
    repoCount: row.repo_count,
  }));
}

export async function getOrg(idOrLogin: string): Promise<WarehouseOrg | null> {
  const needle = idOrLogin.trim().toLowerCase();
  if (!needle) return null;
  const { rows } = await getPool().query<{
    id: string;
    name: string;
    github_login: string;
    avatar_url: string | null;
    repo_count: number;
  }>(
    `
    select
      o.id,
      o.name,
      o.github_login,
      o.avatar_url,
      count(r.id)::int as repo_count
    from orgs o
    left join repos r on r.org_id = o.id and coalesce(r.is_private, false) = false
    where lower(o.id) = $1 or lower(o.github_login) = $1
    group by o.id
    `,
    [needle],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    githubLogin: row.github_login,
    avatarUrl: row.avatar_url,
    repoCount: row.repo_count,
  };
}

export async function searchCatalog(query: string): Promise<{
  orgs: WarehouseOrg[];
  repos: WarehouseRepo[];
}> {
  const needle = query.trim();
  if (!needle) {
    return { orgs: await listOrgs(), repos: [] };
  }
  const like = `%${needle.replace(/[%_\\]/g, "")}%`;
  const [orgs, repos] = await Promise.all([
    getPool().query<{
      id: string;
      name: string;
      github_login: string;
      avatar_url: string | null;
      repo_count: number;
    }>(
      `
      select
        o.id,
        o.name,
        o.github_login,
        o.avatar_url,
        count(r.id)::int as repo_count
      from orgs o
      left join repos r on r.org_id = o.id and coalesce(r.is_private, false) = false
      where o.name ilike $1
         or o.github_login ilike $1
         or o.id ilike $1
      group by o.id
      order by o.name
      limit 8
      `,
      [like],
    ),
    getPool().query<{
      id: string;
      org_id: string;
      name: string;
      full_name: string;
      language: string | null;
      stars: number | null;
    }>(
      `
      select id, org_id, name, full_name, language, stars
      from repos
      where coalesce(is_private, false) = false
        and (name ilike $1 or full_name ilike $1)
      order by stars desc nulls last
      limit 8
      `,
      [like],
    ),
  ]);
  return {
    orgs: orgs.rows.map((row) => ({
      id: row.id,
      name: row.name,
      githubLogin: row.github_login,
      avatarUrl: row.avatar_url,
      repoCount: row.repo_count,
    })),
    repos: repos.rows.map((row) => ({
      id: String(row.id),
      orgId: row.org_id,
      name: row.name,
      fullName: row.full_name,
      language: row.language,
      stars: row.stars,
    })),
  };
}

export function formatFreshness(at: Date | null): string {
  if (!at) return "Never ingested";
  const delta = Date.now() - at.getTime();
  if (delta < 60_000) return "Updated just now";
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}
