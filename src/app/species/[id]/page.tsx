import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchClusterGraph,
  fetchClusterSummaries,
  fetchGeneIndex,
  fetchSpeciesManifest,
} from "@/lib/data";
import { functionColor } from "@/lib/color";
import { topKEdgesPerNode } from "@/lib/graph";
import ClusterList from "@/components/ClusterList";
import GeneSearch from "@/components/GeneSearch";
import NetworkGraph, { type GraphNode } from "@/components/NetworkGraph";

export default async function SpeciesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let manifest, summaries, graph, geneIndex;
  try {
    [manifest, summaries, graph, geneIndex] = await Promise.all([
      fetchSpeciesManifest(id),
      fetchClusterSummaries(id),
      fetchClusterGraph(id),
      fetchGeneIndex(id),
    ]);
  } catch {
    notFound();
  }

  const nodes: GraphNode[] = graph.nodes.map((n) => ({
    id: n.id,
    size: n.size,
    color: functionColor(n.top_function),
    href: `/species/${id}/cluster/${n.id}`,
  }));
  // The meta-graph is too dense to read (avg degree ~32); show each cluster's
  // strongest links only so the backbone is legible.
  const displayEdges = topKEdgesPerNode(graph.edges, 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-emerald-600 hover:underline">
            ← All species
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {manifest.display_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {manifest.n_clusters.toLocaleString()} clusters ·{" "}
            {manifest.n_proteins.toLocaleString()} proteins
          </p>
        </div>
        {manifest.has_network_download && (
          <a
            href={`#`}
            aria-disabled
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-400"
            title="Wire up to raw/network.positive.tsv.gz when served from object storage"
          >
            Download network (TSV.gz)
          </a>
        )}
      </div>

      <GeneSearch speciesId={id} geneIndex={geneIndex} />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Cluster-of-clusters network
        </h2>
        <p className="text-sm text-zinc-500">
          Each node is a cluster, sized by protein count and colored by predicted
          function. Showing each cluster&rsquo;s strongest links only. Click a node to
          open it.
        </p>
        <NetworkGraph nodes={nodes} edges={displayEdges} height={520} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Clusters
        </h2>
        <ClusterList speciesId={id} clusters={summaries} />
      </section>
    </div>
  );
}
