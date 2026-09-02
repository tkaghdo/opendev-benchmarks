# Launch checklist (Build 7)

Launch is a visitor completing the three-beat story on a real stack: useful OpenDev → customer/internal switch → architectural proof. Ask OpenDev and 15–25 orgs wait.

## Host (this repo) — done without dashboards

- [x] Five launch orgs in the warehouse
- [x] 6–8 trusted metrics on `/org` and `/compare` (warehouse SQL until embeds replace the charts)
- [x] Routes: `/`, `/org/[org]`, `/compare`, `/demo/customer/[org]`, `/demo/internal`, `/how-it-works`
- [x] Session BFF, chromeless SDK slots, host filters, customer cookie, internal `skipTenantRls`
- [x] Isolation playground (forged `customerId` ignored)
- [x] Metric inspector and pipeline copy on `/how-it-works`
- [x] Funnel events: `product_view`, `reveal_click`, `how_it_works_view`, `how_it_works_complete`
- [x] Footer + reveal only — no Embedded Canvas pitch on the hero
- [x] Page loads never call GitHub

## Embedded Canvas — you do this

See `docs/OPERATOR-EMBED.md`.

- [ ] Connect OpenDev Postgres; `tenantColumn` = `org_id`
- [ ] Deploy `cube/model/` (or equivalent measures) into EC Cube
- [ ] Chromeless dashboards; same ids on public / customer / internal
- [ ] Org → repo drill-down
- [ ] Allowlist `http://localhost:3000`
- [ ] Fill `.env` embed vars and restart `pnpm dev`
- [ ] Visual QA: pages still read as OpenDev; no Apache chrome; no Dashboards nav

## Six proof points

1. Native embedded analytics (chromeless, host-owned chrome)
2. Organization filtering via host filters
3. Interactive org → repo drill-down
4. Same metric definitions on every surface
5. Customer tenant isolation (HttpOnly cookie → `customerId`)
6. Internal cross-customer analytics (`skipTenantRls`)
