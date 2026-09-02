-- Funnel events for the three-layer launch story. Safe to re-run.

create table if not exists product_events (
  id         bigserial primary key,
  name       text not null,
  path       text,
  created_at timestamptz not null default now()
);

create index if not exists product_events_name_idx on product_events (name);
create index if not exists product_events_created_at_idx on product_events (created_at);
