export function selectUpdatedInWindow<T extends { updatedAt: string }>(
  nodes: T[],
  cutoff: Date,
  lastIngestedAt: Date | null,
): { inWindow: T[]; reachedEnd: boolean } {
  const inWindow: T[] = [];
  for (const node of nodes) {
    const updated = new Date(node.updatedAt);
    if (Number.isNaN(updated.getTime())) continue;
    if (updated < cutoff) break;
    if (lastIngestedAt && updated <= lastIngestedAt) break;
    inWindow.push(node);
  }
  return { inWindow, reachedEnd: inWindow.length < nodes.length };
}
