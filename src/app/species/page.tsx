"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation"; // 2. Changed from notFound/params
import { useEffect, useState, Suspense } from "react"; // 3. Added for client side state
import {
  fetchClusterGraph,
  fetchClusterSummaries,
  fetchGeneIndex,
  fetchSpeciesManifest,
  fetchSpeciesIndex,
  fetchProteins,
} from "@/lib/data";
import { ALL_CATEGORIES, categoryColors } from "@/lib/color";
import { topKEdgesPerNode } from "@/lib/graph";
import ClusterList from "@/components/ClusterList";
import GeneSearch from "@/components/GeneSearch";
import NetworkGraph, { type GraphNode } from "@/components/NetworkGraph";

// 4. Change component definition: remove async, remove old typescript types

function SpeciesContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); // 5. Extracts ?id= from URL

  // 6. Define states to hold the asynchronously fetched data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [manifest, setManifest] = useState<any>(null);
  const [summaries, setSummaries] = useState<any>(null);
  const [graph, setGraph] = useState<any>(null);
  const [geneIndex, setGeneIndex] = useState<any>(null);
  const [proteinsCatalog, setProteinsCatalog] = useState<any>(null);

  // 7. Trigger network fetch sequentially or via Promise.all when the page mounts
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(false);

    Promise.all([
      fetchSpeciesManifest(id),
      fetchSpeciesIndex(),
      fetchClusterSummaries(id),
      fetchClusterGraph(id),
      fetchGeneIndex(id),
      fetchProteins(id),
    ])
      .then(([manifestData, indexData, summariesData, graphData, geneIndexData, proteinsCatalogData]) => {
        const indexMatch = indexData.find((s: any) => s.id === id);
        // Create a patched manifest by layering the index metadata over it
        const patchedManifest = {
          ...manifestData,
          display_name: indexMatch?.display_name || manifestData.display_name || "",
          common_name: indexMatch?.common_name || manifestData.common_name || "",
          assembly_url: indexMatch?.assembly_url || manifestData.assembly_url || "",
          taxid: indexMatch?.taxid !== undefined && indexMatch?.taxid !== null
            ? indexMatch.taxid
            : (manifestData.taxid || null)
        };
        setManifest(patchedManifest);
        setSummaries(summariesData);
        setGraph(graphData);
        setGeneIndex(geneIndexData);
        setProteinsCatalog(proteinsCatalogData); // 2. Track the catalog in state        
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [id]);

  // 8. Handle intermediate edge states
  if (!id) return <div className="p-8 text-zinc-500">No Species ID provided in URL parameters.</div>;
  if (loading) return <div className="p-8 text-zinc-500">Loading species data...</div>;
  if (error || !manifest || !summaries || !graph || !geneIndex) {
    return <div className="p-8 text-red-500">Species data not found. Check connection or data parameters.</div>;
  }

  // 9. Process network graphing variables precisely like before
  // Color by the LLM cluster name, which lives on the summaries, not the
  // meta-graph nodes — join the two on the cluster hash.
  const titleByHash = new Map<string, string>(
    summaries.map((c: any): [string, string] => [c.hash, c.title]),
  );
  const nodes: GraphNode[] = graph.nodes.map((n: any) => ({
    id: n.id,
    size: n.size,
    colors: categoryColors(titleByHash.get(n.id)),
    href: `/species/cluster?id=${id}&hash=${n.id}`, // 10. FIXED: Changed route format to query string
  }));


  // The meta-graph is too dense to read (avg degree ~32); show each cluster's
  // strongest links only so the backbone is legible.
  const displayEdges = topKEdgesPerNode(graph.edges, 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/species-list" className="text-sm text-emerald-600 hover:underline">
            ← All species
          </Link>
{/* Big Header Text: Common (Scientific/Display Name) */}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {manifest.common_name || manifest.display_name}{" "}
            {manifest.common_name && (
              <span className="text-lg font-normal text-zinc-500 italic ml-1">
                ({manifest.display_name})
              </span>
            )}
          </h1>
          
          {/* Database & Taxonomy Metadata Badges Link Row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {manifest.assembly_url && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Genome Reference:</span>
                <a 
                  href={manifest.assembly_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-emerald-700 hover:underline font-medium bg-zinc-100/80 px-1.5 py-0.5 rounded border border-zinc-200/50"
                >
                  {id} ↗
                </a>
              </div>
            )}

            {manifest.taxid && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Taxonomy:</span>
                <a 
                  href={`https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${manifest.taxid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-emerald-700 hover:underline font-medium bg-zinc-100/80 px-1.5 py-0.5 rounded border border-zinc-200/50"
                >
                  TAXID:{manifest.taxid} ↗
                </a>
              </div>
            )}
          </div>

          {/* Counts Line (Preserved exactly) */}
          <p className="mt-3 text-sm text-zinc-500">
            {manifest.n_clusters.toLocaleString()} clusters ·{" "}
            {manifest.n_proteins.toLocaleString()} proteins
          </p>
        </div>
        {manifest.has_network_download && (() => {
          // Construct same-origin absolute paths relative to the web root
          const networkDownloadUrl = `/philharmonicDB/preprocessed_data/species/${manifest.id}/raw/network.positive.tsv.gz`;
          const medfordDownloadUrl = `/philharmonicDB/preprocessed_data/species/${manifest.id}/${manifest.id}.mfd`;

          return (
            <div className="flex flex-row items-center gap-2">
              {/* Left Button: Download MEDFORD */}
              <a
                href={medfordDownloadUrl}
                download={`${manifest.id}.mfd`}
                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 hover:border-zinc-300 shadow-sm"
                title="Download MEDFORD metadata file"
              >
                Download MEDFORD
              </a>

              {/* Right Button: Download Network */}
              <a
                href={networkDownloadUrl}
                download={`network.${manifest.id}.positive.tsv.gz`}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300 shadow-sm"
                title="Download raw network data"
              >
                Download network (TSV.gz)
              </a>
            </div>
          );
        })()}
      </div>

      <GeneSearch speciesId={id} geneIndex={geneIndex} proteinsCatalog={proteinsCatalog}/>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Cluster-of-clusters network
        </h2>
        <p className="text-sm text-zinc-500">
          Each node is a cluster, sized by protein count and colored by predicted
          function. Clusters spanning several themes are split proportionally.
          Showing each cluster&rsquo;s strongest links only. Click a node to open it.
        </p>
        <NetworkGraph nodes={nodes} edges={displayEdges} height={520} />
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {ALL_CATEGORIES.map((c) => (
            <li key={c.key} className="flex items-center gap-1.5 text-xs text-zinc-600">
              <span
                className="inline-block h-3 w-3 rounded-full border border-black/10"
                style={{ backgroundColor: c.color }}
              />
              {c.label}
            </li>
          ))}
        </ul>
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

export default function SpeciesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <SpeciesContent />
    </Suspense>
  );
}
