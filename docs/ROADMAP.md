# OpenDev Benchmarks — build roadmap

Ten builds, ten tasks each. **Launch is the end of Build 7.** Builds 8–10 wait until a visitor can already believe OpenDev is a useful GitHub product.

Full task lists live in the Cursor canvas from the planning session. This file is the in-repo index.

## Rules

- Useful public product first. Embedded Canvas reveal second. Architecture proof third.
- Never query GitHub on visitor page loads.
- Tenant security is server-side (embed session RLS). Host filters are not isolation.
- Cube is infrastructure. Metrics are defined once and reused.
- Do not advertise Embedded Canvas on the hero.

## Launch track

| Build | Name | Exit gate |
| --- | --- | --- |
| 1 | Warehouse and GitHub ingestion | 12 months for 5 orgs; idempotent upsert; quality checks |
| 2 | Cube semantic layer | Golden queries match warehouse SQL; pre-aggs; fail-closed security |
| 3 | OpenDev product shell | Routes, search, org chrome, honest stubs *(this scaffold)* |
| 4 | Public org and compare MVP | 6–8 trusted metrics + median comparisons |
| 5 | Native Embedded Canvas analytics | Chromeless embeds; delete temporary charts |
| 6 | Customer vs internal reveal | Same dashboards; RLS vs skipTenantRls |
| 7 | How it works and public launch | Three-beat story on a deployed stack |

## After launch

| Build | Name |
| --- | --- |
| 8 | Benchmarks and catalog scale (15–25 orgs) |
| 9 | Ask OpenDev (constrained semantic queries, not free SQL) |
| 10 | Analytical depth (collaboration, code-change, repo pages, PR drill) |

## Launch proof points

1. Native embedded analytics
2. Organization filtering via host filters
3. Interactive org → repo drill-down
4. Same metric definitions
5. Customer tenant isolation
6. Internal cross-customer analytics

## Scaffold status

Build 1 ingestion lives in `apps/ingestion` (GraphQL PRs/issues/reviews, REST org metadata, idempotent upserts, cursors, quality checks). Build 3 shell is in `apps/web`. Cube YAML stubs are in `cube/`.
