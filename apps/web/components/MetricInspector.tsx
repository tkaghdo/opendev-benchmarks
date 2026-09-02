import { LAUNCH_METRICS, type MetricDefinition } from "@opendev/catalog";

const INSPECT_KEYS = ["median_cycle_time", "median_first_review", "prs_merged"] as const;

function InspectorCard({ metric }: { metric: MetricDefinition }) {
  return (
    <article className="panel inspector-card">
      <p className="kicker">{metric.key}</p>
      <h3>{metric.name}</h3>
      <p>{metric.formula}</p>
      <p className="org-meta">
        Source <code>{metric.source}</code> · measure <code>{metric.cubeMeasure}</code>
      </p>
      <p className="org-meta">Inclusion: {metric.inclusion}</p>
      <ul className="used-by">
        <li>OpenDev public</li>
        <li>DevMetrics customer</li>
        <li>DevMetrics internal</li>
      </ul>
    </article>
  );
}

export function MetricInspector() {
  const metrics = INSPECT_KEYS.map((key) => LAUNCH_METRICS.find((metric) => metric.key === key)).filter(
    (metric): metric is MetricDefinition => Boolean(metric),
  );

  return (
    <div className="inspector-grid">
      {metrics.map((metric) => (
        <InspectorCard key={metric.key} metric={metric} />
      ))}
    </div>
  );
}
