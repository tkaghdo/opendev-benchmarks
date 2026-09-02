import type { ReactNode } from "react";
import type { MetricDefinition } from "@opendev/catalog";

export function KpiCard({
  name,
  value,
  vs,
  metric,
  liveValue,
}: {
  name: string;
  value: string;
  vs?: string | null;
  metric?: MetricDefinition;
  liveValue?: ReactNode;
}) {
  return (
    <div className="metric">
      <dt>{name}</dt>
      {liveValue ?? <dd>{value}</dd>}
      {vs ? <p className="metric-vs">{vs}</p> : null}
      {metric ? (
        <details className="metric-def">
          <summary>Definition</summary>
          <p>{metric.formula}</p>
          <p>Inclusion: {metric.inclusion}</p>
        </details>
      ) : null}
    </div>
  );
}
