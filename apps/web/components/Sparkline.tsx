export function Sparkline({
  points,
  labels,
  height = 140,
}: {
  points: Array<number | null>;
  labels?: string[];
  height?: number;
}) {
  const width = 640;
  const values = points.filter((value): value is number => value != null && Number.isFinite(value));
  if (values.length < 2) {
    return <p className="empty-state">Not enough weekly points in this range.</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points
    .map((value, index) => {
      if (value == null || !Number.isFinite(value)) return null;
      const x = (index / Math.max(points.length - 1, 1)) * (width - 8) + 4;
      const y = height - 16 - ((value - min) / span) * (height - 28);
      return `${x},${y}`;
    })
    .filter((pair): pair is string => pair != null);

  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={coords.join(" ")} />
      {labels?.length ? (
        <text x="4" y={height - 2} className="spark-caption">
          {labels[0]} → {labels[labels.length - 1]}
        </text>
      ) : null}
    </svg>
  );
}

export function DualSparkline({
  left,
  right,
  labels,
  leftName,
  rightName,
  height = 180,
}: {
  left: Array<number | null>;
  right: Array<number | null>;
  labels: string[];
  leftName: string;
  rightName: string;
  height?: number;
}) {
  const width = 720;
  const values = [...left, ...right].filter((value): value is number => value != null && Number.isFinite(value));
  if (values.length < 2) {
    return <p className="empty-state">Not enough weekly cycle-time points to overlay.</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const toPoints = (series: Array<number | null>) =>
    series
      .map((value, index) => {
        if (value == null || !Number.isFinite(value)) return null;
        const x = (index / Math.max(series.length - 1, 1)) * (width - 8) + 4;
        const y = height - 20 - ((value - min) / span) * (height - 36);
        return `${x},${y}`;
      })
      .filter((pair): pair is string => pair != null)
      .join(" ");

  return (
    <figure className="overlay">
      <svg className="spark" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="12-month cycle time overlay">
        <polyline className="spark-left" fill="none" strokeWidth="2" points={toPoints(left)} />
        <polyline className="spark-right" fill="none" strokeWidth="2" points={toPoints(right)} />
        <text x="4" y={height - 4} className="spark-caption">
          {labels[0]} → {labels[labels.length - 1]} · hours
        </text>
      </svg>
      <figcaption className="overlay-legend">
        <span className="legend-left">{leftName}</span>
        <span className="legend-right">{rightName}</span>
      </figcaption>
    </figure>
  );
}
