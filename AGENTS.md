# Agent notes — OpenDev Benchmarks

- Public product name is **OpenDev Benchmarks**. Analytics platform name is **Embedded Canvas**. Do not use Kepler in user-facing copy.
- This repo is an integrator app. **Never modify Embedded Canvas source** (control plane or runtime). Do not copy those internals. Consume Embedded Canvas via session mint + `@embeddedcanvas/embed-sdk` only.
- The point of OpenDev is to **showcase Embedded Canvas**. OpenDev owns GitHub ingestion and Postgres. Embedded Canvas owns the semantic layer (Cube), the analytics runtime, RLS, and chromeless embeds. Do not operate a customer Cube in Compose as the visitor path.
- Never query the GitHub API on visitor page loads. Ingestion is a worker; public traffic hits Postgres and Embedded Canvas only.
- Tenant security is server-side only. Frontend filters are not isolation. Customer embed sessions use `customerId` = org slug. Public and internal sessions are unscoped (`skipTenantRls` / host filters).
- Launch metrics are defined once in the catalog and deployed into **EC Cube**, then reused on public, customer, internal, and later Ask OpenDev.
- Launch is the end of Build 7: five orgs, 6–8 metrics, chromeless embeds, customer/internal switch, `/how-it-works`. Ask OpenDev and 15–25 orgs wait until after launch.
- Do not advertise Embedded Canvas on the OpenDev hero. Footer + reveal + `/how-it-works` are enough.
