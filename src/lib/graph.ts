import type { ClusterGraphEdge } from "./types";

/**
 * Sparsify a dense weighted graph for readable layout by keeping only each
 * node's `k` strongest edges (a k-nearest-neighbor / "backbone" reduction).
 *
 * The cluster-of-clusters graph is extremely dense (avg degree ~32), which
 * collapses into a hairball. Keeping the top few edges per node preserves the
 * connected backbone while making the structure legible. An edge survives if it
 * is in the top-k of *either* endpoint (union, so the graph stays connected).
 */
export function topKEdgesPerNode(
  edges: ClusterGraphEdge[],
  k = 3,
): ClusterGraphEdge[] {
  const byNode = new Map<string, ClusterGraphEdge[]>();
  for (const e of edges) {
    (byNode.get(e.source) ?? byNode.set(e.source, []).get(e.source)!).push(e);
    (byNode.get(e.target) ?? byNode.set(e.target, []).get(e.target)!).push(e);
  }

  const keep = new Set<string>();
  const edgeKey = (e: ClusterGraphEdge) =>
    e.source < e.target ? `${e.source}\t${e.target}` : `${e.target}\t${e.source}`;

  for (const list of byNode.values()) {
    list
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .slice(0, k)
      .forEach((e) => keep.add(edgeKey(e)));
  }

  return edges.filter((e) => keep.has(edgeKey(e)));
}
