import { getOrg } from "@opendev/catalog";
import { notFound } from "next/navigation";
import { StubPanel } from "@/components/StubPanel";
import { RevealLink } from "@/components/MetricPlaceholders";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ org1: string; org2: string }>;
}) {
  const { org1, org2 } = await params;
  const left = getOrg(org1);
  const right = getOrg(org2);
  if (!left || !right) notFound();

  const rows = [
    "PR cycle time",
    "First review",
    "PR throughput",
    "Active contributors",
    "Issue resolution",
    "PR size",
    "Contributor growth",
  ];

  return (
    <section>
      <h1>
        {left.name} vs {right.name}
      </h1>
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "20px 0" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-muted)" }}>Metric</th>
            <th style={{ textAlign: "right", padding: "8px 0", color: "var(--text-muted)" }}>{left.name}</th>
            <th style={{ textAlign: "right", padding: "8px 0", color: "var(--text-muted)" }}>{right.name}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td style={{ padding: "8px 0", borderTop: "1px solid var(--stroke)" }}>{row}</td>
              <td style={{ padding: "8px 0", borderTop: "1px solid var(--stroke)", textAlign: "right" }}>—</td>
              <td style={{ padding: "8px 0", borderTop: "1px solid var(--stroke)", textAlign: "right" }}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
      <StubPanel build="Build 4">
        Scorecard values and 12-month cycle time, contributor growth, and issue backlog overlays come
        from Cube. Build 5 swaps charts for chromeless Embedded Canvas embeds.
      </StubPanel>
      <RevealLink />
    </section>
  );
}
