# OpenDev Benchmarks

Public developer analytics. Visitors explore how well-known open-source organizations ship software.

**Live:** [opendev.embeddedcanvas.com](https://opendev.embeddedcanvas.com)

This repository is a **customer of [Embedded Canvas](https://embeddedcanvas.com)**, not a fork of it. The control plane lives in a separate workspace. OpenDev talks to it the way any B2B SaaS would: a server-side session mint and the public embed SDK.

> How does the world's best software get built?

## Layout

| Path | Role |
| --- | --- |
| `apps/web` | Next.js OpenDev site (public product, DevMetrics demo shells, `/how-it-works`) |
| `apps/ingestion` | GitHub → Postgres worker |
| `packages/catalog` | Curated launch organizations and metric names |
| `db/` | Warehouse schema and seed orgs |
| `cube/` | Draft metric YAML — deploy into **Embedded Canvas Cube**, do not run as OpenDev’s runtime |
| `docs/OPERATOR-EMBED.md` | Register chromeless dashboards and set embed tokens |

## Launch orgs

Vercel, Supabase, Prisma, Temporal, HashiCorp.

## Local

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Postgres is enough for the product shell and warehouse KPIs. Do not treat a local Cube container as the analytics product — Embedded Canvas owns Cube.

### Ingestion

Put a GitHub token in `.env` (`GITHUB_TOKEN`). Public repo read is enough. Never put that token in the Next.js app.

```bash
pnpm db:up
pnpm ingest         # one 12-month backfill of the curated repos
pnpm ingest:quality
pnpm ingest:loop    # repeat every 4 hours
```

Visitor page loads never call GitHub.

### Embedded Canvas

Register chromeless dashboards in Embedded Canvas, then set server-only `EMBED_API_KEY` plus per-slot `NEXT_PUBLIC_EMBED_TOKEN_*` values. See `docs/OPERATOR-EMBED.md`.

`NEXT_PUBLIC_*` tokens are inlined at `pnpm build`. Restarting the process is not enough.

## What is not in this repo

- `.env` (API keys, GitHub token, live embed tokens)
- Warehouse data
- The Embedded Canvas control plane and per-workspace runtime

`.env.example` is placeholders only.

## Naming

- Product visitors see: **OpenDev Benchmarks**
- Analytics platform: **Embedded Canvas**
- Dashboard builder infrastructure: Apache Superset (named in `/how-it-works` and operator docs)
