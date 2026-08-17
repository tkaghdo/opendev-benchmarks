# Agent notes — OpenDev Benchmarks

- Public product name is **OpenDev Benchmarks**. Analytics platform name is **Embedded Canvas**. Do not use Kepler in user-facing copy.
- This repo is an integrator app. Do not copy control-plane internals. Consume Embedded Canvas via session mint + `@embeddedcanvas/embed-sdk`.
- Never query the GitHub API on visitor page loads. Ingestion is a worker; public traffic hits Postgres / Cube / Embedded Canvas only.
- Tenant security is server-side only. Frontend filters are not isolation. Customer embed sessions use `customerId` = org slug. Public and internal sessions are unscoped (`skipTenantRls` / host filters).
- Cube is infrastructure, not the product story. Define metrics once; reuse them on public, customer, internal, and later Ask OpenDev.
- Launch is the end of Build 7: five orgs, 6–8 metrics, chromeless embeds, customer/internal switch, `/how-it-works`. Ask OpenDev and 15–25 orgs wait until after launch.
- Do not advertise Embedded Canvas on the OpenDev hero. Footer + reveal + `/how-it-works` are enough.
