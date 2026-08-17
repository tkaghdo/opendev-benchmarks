import pg from "pg";

const SCHEMA_SQL = `
create table if not exists orgs (
  id            text primary key,
  name          text not null,
  github_login  text not null unique,
  avatar_url    text,
  created_at    timestamptz
);

create table if not exists repos (
  id               bigint primary key,
  org_id           text not null references orgs(id),
  name             text not null,
  full_name        text not null,
  is_private       boolean default false,
  stars            integer,
  language         text,
  created_at       timestamptz,
  updated_at       timestamptz,
  last_ingested_at timestamptz
);

create table if not exists contributors (
  id      bigint primary key,
  login   text not null,
  org_id  text references orgs(id)
);

create table if not exists pull_requests (
  id                bigint primary key,
  repo_id           bigint not null references repos(id),
  org_id            text not null references orgs(id),
  author_id         bigint references contributors(id),
  number            integer not null,
  state             text,
  created_at        timestamptz,
  merged_at         timestamptz,
  closed_at         timestamptz,
  first_review_at   timestamptz,
  additions         integer,
  deletions         integer,
  changed_files     integer,
  github_updated_at timestamptz
);

create table if not exists issues (
  id          bigint primary key,
  repo_id     bigint not null references repos(id),
  org_id      text not null references orgs(id),
  author_id   bigint references contributors(id),
  number      integer not null,
  state       text,
  created_at  timestamptz,
  closed_at   timestamptz,
  is_bug      boolean default false
);

create table if not exists commits (
  sha           text primary key,
  repo_id       bigint not null references repos(id),
  org_id        text not null references orgs(id),
  author_id     bigint references contributors(id),
  committed_at  timestamptz,
  additions     integer,
  deletions     integer
);

create table if not exists reviews (
  id              bigint primary key,
  pull_request_id bigint not null references pull_requests(id),
  reviewer_id     bigint references contributors(id),
  state           text,
  submitted_at    timestamptz
);

create table if not exists ingestion_runs (
  id               bigserial primary key,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           text not null,
  rows_upserted    integer default 0,
  github_remaining integer,
  error            text
);

create table if not exists ingest_cursors (
  repo_id     bigint not null references repos(id),
  entity      text not null,
  cursor      text,
  watermark   timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (repo_id, entity)
);

alter table pull_requests add column if not exists github_updated_at timestamptz;

create index if not exists pull_requests_org_id_idx on pull_requests (org_id);
create index if not exists pull_requests_repo_id_idx on pull_requests (repo_id);
create index if not exists pull_requests_created_at_idx on pull_requests (created_at);
create index if not exists pull_requests_merged_at_idx on pull_requests (merged_at);
create index if not exists issues_org_id_idx on issues (org_id);
create index if not exists issues_repo_id_idx on issues (repo_id);
create index if not exists issues_created_at_idx on issues (created_at);
create index if not exists commits_org_id_idx on commits (org_id);
create index if not exists commits_repo_id_idx on commits (repo_id);
create index if not exists commits_committed_at_idx on commits (committed_at);
create index if not exists reviews_pull_request_id_idx on reviews (pull_request_id);
create index if not exists reviews_submitted_at_idx on reviews (submitted_at);
create index if not exists repos_org_id_idx on repos (org_id);
create index if not exists repos_updated_at_idx on repos (updated_at);
`;

export async function ensureSchema(pool: pg.Pool): Promise<void> {
  await pool.query(SCHEMA_SQL);
}

export async function pingDatabase(pool: pg.Pool): Promise<boolean> {
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}

export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl, max: 4 });
}
