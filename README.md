# OpenDev Benchmarks

Public developer-analytics product. Visitors explore how well-known open-source organizations ship software. Embedded Canvas provides the analytics layer; it stays mostly invisible until the visitor chooses to see how the experience is built.

> How does the world's best software get built?

This repository is a **customer of Embedded Canvas**, not a fork of it. The control plane lives in a separate workspace. OpenDev talks to it the way any B2B SaaS would: a server-side session mint and the public embed SDK.

## Layout

| Path | Role |
| --- | --- |
| `apps/web` | Next.js OpenDev site (public product, DevMetrics demo shells, `/how-it-works`) |
| `apps/ingestion` | GitHub → Postgres worker (Build 1) |
| `packages/catalog` | Curated launch organizations and metric names |
| `db/` | Warehouse schema and seed orgs |
| `cube/` | Semantic layer (Build 2) |
| `docs/ROADMAP.md` | Ten builds, ten tasks each |

## Launch orgs

Vercel, Supabase, Prisma, Temporal, HashiCorp. Expand to 15–25 only after launch (Build 8).

## Local

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Postgres is enough for the shell. Cube starts with `pnpm stack:up` when you begin semantic work.

### Ingestion (Build 1)

Put a GitHub token in `.env` (`GITHUB_TOKEN`). Public repo read is enough. Never put that token in the Next.js app.

```bash
pnpm db:up          # Docker Desktop must be running
pnpm ingest         # one 12-month backfill of the curated repos
pnpm ingest:quality # integrity checks
pnpm ingest:loop    # repeat every 4 hours
```

The worker upserts by GitHub ids, resumes from `ingest_cursors`, skips unchanged repos, and records `ingestion_runs`. Visitor page loads never call GitHub.

Health: `http://localhost:8081/` while the worker is running. Compose: `docker compose --profile ingest up -d`.

## Embedded Canvas

Do not add embed SDK wiring until Build 5. When you do:

- Mint sessions from the Next.js BFF (`POST /public/embed/v1/sessions`)
- Keep `EMBED_API_KEY` on the server
- Public and internal sessions are unscoped; customer sessions set `customerId` to the org slug so RLS is `org_id = that customer`
- Mount chromeless `@embeddedcanvas/embed-sdk` inside OpenDev chrome — no Apache branding in the host UI

## Naming

- Product visitors see: **OpenDev Benchmarks**
- Analytics platform: **Embedded Canvas**
- Dashboard builder infrastructure: Apache (named only in `/how-it-works` and operator docs)

## What is not in this scaffold

Cube golden queries, Embedded Canvas embeds, tenant switching, and Ask OpenDev. Those are Builds 2–10 in `docs/ROADMAP.md`.
