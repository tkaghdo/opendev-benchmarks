# OpenDev Benchmarks — build roadmap

Ten builds, ten tasks each. **Launch is the end of Build 7.** Builds 8–10 wait until a visitor can already believe OpenDev is a useful GitHub product.

Full task lists live in the Cursor canvas from the planning session. This file is the in-repo index.

## Rules

- Useful public product first. Embedded Canvas reveal second. Architecture proof third.
- Never query GitHub on visitor page loads.
- Tenant security is server-side (embed session RLS). Host filters are not isolation.
- Never modify Embedded Canvas source. This repo is an integrator only.
- Cube is **Embedded Canvas** infrastructure. OpenDev does not run a second Cube for visitors. Metrics are defined once, deployed into EC Cube, and reused.
- Do not advertise Embedded Canvas on the hero.

## Launch track

| Build | Name | Status |
| --- | --- | --- |
| 1 | Warehouse and GitHub ingestion | Done |
| 2 | Launch metric catalog | Done (YAML is a handoff into EC Cube) |
| 3 | OpenDev product shell | Done |
| 4 | Public org and compare MVP | Done (warehouse KPIs; keep until embeds are live) |
| 5 | Native Embedded Canvas analytics | Host ready — **you** register dashboards |
| 6 | Customer vs internal reveal | Host ready — same tokens, different security context |
| 7 | How it works and public launch | Host ready — `/how-it-works`, funnel, checklist |

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

## Operator next step

Register chromeless dashboards in Embedded Canvas and fill embed env vars. Instructions: `docs/OPERATOR-EMBED.md`. Launch checklist: `docs/LAUNCH.md`.
