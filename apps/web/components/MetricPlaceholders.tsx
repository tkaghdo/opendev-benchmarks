import Link from "next/link";

const metricLabels = [
  "PRs merged",
  "Median PR cycle time",
  "Median time to first review",
  "PRs per active contributor",
  "Active contributors",
  "Issues opened",
  "Issues resolved",
  "Issue resolution time",
  "Backlog growth",
  "Commits",
];

export function MetricPlaceholders() {
  return (
    <dl className="metrics">
      {metricLabels.map((label) => (
        <div className="metric" key={label}>
          <dt>{label}</dt>
          <dd>—</dd>
        </div>
      ))}
    </dl>
  );
}

export function RevealLink() {
  return (
    <p>
      <Link href="/how-it-works" className="reveal">
        See how this analytics experience was built →
      </Link>
    </p>
  );
}
