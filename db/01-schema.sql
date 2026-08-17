-- OpenDev warehouse. Public traffic never hits GitHub; this is the source of truth.

create table orgs (
  id            text primary key,
  name          text not null,
  github_login  text not null unique,
  avatar_url    text,
  created_at    timestamptz
);

create table repos (
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

create table contributors (
  id      bigint primary key,
  login   text not null,
  org_id  text references orgs(id)
);

create table pull_requests (
  id              bigint primary key,
  repo_id         bigint not null references repos(id),
  org_id          text not null references orgs(id),
  author_id       bigint references contributors(id),
  number          integer not null,
  state           text,
  created_at      timestamptz,
  merged_at       timestamptz,
  closed_at       timestamptz,
  first_review_at timestamptz,
  additions       integer,
  deletions       integer,
  changed_files   integer
);

create table issues (
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

create table commits (
  sha           text primary key,
  repo_id       bigint not null references repos(id),
  org_id        text not null references orgs(id),
  author_id     bigint references contributors(id),
  committed_at  timestamptz,
  additions     integer,
  deletions     integer
);

create table reviews (
  id              bigint primary key,
  pull_request_id bigint not null references pull_requests(id),
  reviewer_id     bigint references contributors(id),
  state           text,
  submitted_at    timestamptz
);

create table ingestion_runs (
  id               bigserial primary key,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           text not null,
  rows_upserted    integer default 0,
  github_remaining integer,
  error            text
);

create index pull_requests_org_id_idx on pull_requests (org_id);
create index pull_requests_repo_id_idx on pull_requests (repo_id);
create index pull_requests_created_at_idx on pull_requests (created_at);
create index pull_requests_merged_at_idx on pull_requests (merged_at);

create index issues_org_id_idx on issues (org_id);
create index issues_repo_id_idx on issues (repo_id);
create index issues_created_at_idx on issues (created_at);

create index commits_org_id_idx on commits (org_id);
create index commits_repo_id_idx on commits (repo_id);
create index commits_committed_at_idx on commits (committed_at);

create index reviews_pull_request_id_idx on reviews (pull_request_id);
create index reviews_submitted_at_idx on reviews (submitted_at);

create index repos_org_id_idx on repos (org_id);
create index repos_updated_at_idx on repos (updated_at);
