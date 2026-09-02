# OpenDev metric catalog

These definitions are the product metrics. They are a **handoff into Embedded Canvas Cube**, not a second semantic layer OpenDev operates. Public OpenDev, customer embed, internal embed, and Ask OpenDev must use the same EC Cube measures.

| Key | Cube measure | Inclusion |
| --- | --- | --- |
| PRs merged | `pull_requests.merged_count` | `merged_at is not null` |
| Median PR cycle time | `pull_requests.median_cycle_time_hours` | merged PRs only; `percentile_cont(0.5)` of hours |
| Median time to first review | `pull_requests.median_time_to_first_review_hours` | `first_review_at is not null` |
| Active contributors | `pull_requests.active_contributors` | distinct PR `author_id` |
| New contributors | `contributor_first_seen.new_contributors` | first PR date in range |
| Issues resolved | `issues.closed_count` | `closed_at is not null` |
| Median issue resolution | `issues.median_resolution_time_hours` | closed issues |
| PR size | `pull_requests.avg_pr_size` | additions + deletions |
| Bug ratio | `issues.bug_ratio` | `is_bug` / all issues |
| Contributor concentration | `contributor_concentration.top10_share` | top 10 authors’ share of PRs (all-time, non-additive) |
| Last ingest | `ingestion_runs.last_success_at` | successful runs only |

Contributor concentration is org-grain and all-time. It is not in the daily pre-aggregations.

Daily pre-aggregations refresh every two hours for additive PR, issue, and commit measures at org × repo × day.

## Security (Embedded Canvas)

Isolation is embed-session RLS on `org_id`, not a host Cube `queryRewrite`.

- Public and internal sessions: unscoped (`skipTenantRls` / host filters)
- Customer sessions: `customerId` = org slug → `org_id = that customer`
- Frontend filters are not tenant security
