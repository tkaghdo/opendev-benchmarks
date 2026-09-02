import Link from "next/link";
import { EmbedSlot } from "@/components/EmbedSlot";
import { formatCount } from "@/lib/format";
import { rangeHostFilters } from "@/lib/hostFilters";
import { loadRepoRows } from "@/lib/metrics";
import { parseRange, rangeLabel } from "@/lib/range";

export const dynamic = "force-dynamic";

export default async function ReposPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ range?: string; repo?: string }>;
}) {
  const { org } = await params;
  const query = await searchParams;
  const days = parseRange(query.range);
  const selectedRepo = query.repo?.trim() ?? "";
  const repos = await loadRepoRows(org, days);
  const selected = repos.find((repo) => repo.id === selectedRepo || repo.name === selectedRepo);

  if (repos.length === 0) {
    return <p className="empty-state">No repositories in the warehouse for this organization.</p>;
  }

  const rangeSuffix = query.range ? `&range=${query.range}` : "";

  return (
    <section>
      <p className="org-meta">
        {rangeLabel(days)} · select a repository to pass <code>repo_id</code> into the embed as a host
        filter. Per-repo metrics wait until the governed catalog publishes repository grain.
      </p>
      <table className="scorecard">
        <thead>
          <tr>
            <th>Repository</th>
            <th>Language</th>
            <th>Stars</th>
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => {
            const active = selected?.id === repo.id;
            return (
              <tr key={repo.id} className={active ? "is-selected" : undefined}>
                <td>
                  <Link href={`/org/${org}/repos?repo=${encodeURIComponent(repo.id)}${rangeSuffix}`}>
                    {repo.name}
                  </Link>
                  <div className="org-meta">{repo.fullName}</div>
                </td>
                <td>{repo.language ?? "—"}</td>
                <td>{formatCount(repo.stars)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <EmbedSlot
        audience="public"
        orgId={org}
        slot="repos"
        label={selected ? `${selected.name} activity` : "Repository activity"}
        filters={rangeHostFilters(days, {
          org_id: org,
          ...(selected
            ? { repo_id: selected.id, repo_name: selected.name }
            : {}),
        })}
      />
    </section>
  );
}
