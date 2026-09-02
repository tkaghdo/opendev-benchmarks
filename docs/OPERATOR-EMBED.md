# Embedding dashboards (operator)

OpenDev is ready for chromeless Embedded Canvas dashboards. **You** register the dashboards in Embedded Canvas. This repo does not modify Embedded Canvas source.

Warehouse KPIs and sparklines stay on org/compare pages until the embeds are live. Slots light up when env is set. Do not delete those charts until you have confirmed the dashboards.

## In Embedded Canvas (UI)

1. Connect the OpenDev Postgres warehouse (`postgres://opendev:opendev@localhost:5432/opendev`). Tenant column: `org_id`.
2. Enable governed metrics / Cube. Deploy the launch YAML from this repo’s `cube/model/` (or rebuild the same measures in the visual modeler). See `cube/METRICS.md`.
3. Build dashboards for throughput, cycle time, first review, issues, contributors, and repo activity. Reuse the **same dashboard ids** on public, customer, and internal.
4. Enable org → repo drill-down on the charts that should accept `repo_id`.
5. Register embed tokens, layout **chromeless**, allowlist `http://localhost:3000` (and the public origin later).
6. Create an embed API key (`ec_live_…`).

Host filters OpenDev already sends:

| Field | When |
| --- | --- |
| `dateFrom` / `dateTo` | 30 / 90 / 365 range control |
| `extra.org_id` | Public org pages, compare columns, customer demo |
| `extra.repo_id` / `extra.repo_name` | Repositories tab after a row is selected |
| `extra.section` | `delivery`, `issues`, `contributors`, `repos`, `compare`, `collaboration` |

## In this repo

```
EMBEDDED_CANVAS_API_URL=https://your-ec-api
EMBEDDED_CANVAS_APP_URL=https://your-ec-app
EMBED_API_KEY=ec_live_…
EMBED_TOKEN=…
NEXT_PUBLIC_EMBED_TOKEN=…
```

Optional per-slot public tokens (fall back to `NEXT_PUBLIC_EMBED_TOKEN`):

`NEXT_PUBLIC_EMBED_TOKEN_OVERVIEW`, `_DELIVERY`, `_ISSUES`, `_CONTRIBUTORS`, `_REPOS`, `_COLLABORATION`, `_COMPARE`, `_CUSTOMER`, `_INTERNAL`

Mirror any extra tokens as `EMBED_TOKEN_*` as well so the BFF allowlist can mint them. The API key stays on the server. Restart `pnpm dev`.

`EMBEDDED_CANVAS_APP_URL` (or `NEXT_PUBLIC_EMBED_ORIGIN`) is the iframe origin. OpenDev adds it to `Content-Security-Policy: frame-src` when set.

## What OpenDev already does

- `POST /api/analytics/session` mints `POST /public/embed/v1/sessions`. It **never** trusts `customerId` from the client. Unknown embed tokens are ignored.
- Public sessions are unscoped (`customerId=public`, `skipTenantRls`). Host filters select the organization. That is not tenant isolation.
- `/demo/customer/[org]` sets an HttpOnly cookie; customer sessions are scoped to it (`org_id` RLS).
- `/demo/internal` sends `skipTenantRls: true` with the same embed token so every org is visible.
- Chromeless `@embeddedcanvas/embed-sdk` mounts in slots on overview, delivery, issues, contributors, repos, collaboration, compare, and both demo shells.

Isolation is embed-session RLS on `org_id`. Host filters are a product control, not a security boundary.
