"use client"; // 1. Set context to browser execution

import Link from "next/link";
import { useSearchParams } from "next/navigation"; // 2. Swapped notFound for query params hook
import { useEffect, useState, Suspense } from "react"; // 3. Added for tracking local state
import { fetchClusterDetail, fetchGoTerms } from "@/lib/data";
import { goName, goUrl } from "@/lib/go";
import NetworkGraph, { type GraphNode } from "@/components/NetworkGraph";
import Expandable from "@/components/Expandable";

// 4. Changed definition: removed async and original typescript wrapper
function ClusterContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); // 5. Read species id (?id=)
  const hash = searchParams.get("hash"); // 6. Read cluster hash (?hash=)

  // 7. Establish React state variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cluster, setCluster] = useState<any>(null);
  const [goMap, setGoMap] = useState<any>(null);

  // 8. Fetch data inside browser when component mounts or search params change
  useEffect(() => {
    if (!id || !hash) return;

    setLoading(true);
    setError(false);

    Promise.all([fetchClusterDetail(id, hash), fetchGoTerms()])
      .then(([clusterData, goMapData]) => {
        setCluster(clusterData);
        setGoMap(goMapData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [id, hash]);

  // 9. Handle initial boundary states
  if (!id || !hash) return <div className="p-8 text-zinc-500">Missing query parameters (id and hash required).</div>;
  if (loading) return <div className="p-8 text-zinc-500">Loading cluster detail...</div>;
  if (error || !cluster) return <div className="p-8 text-red-500">Cluster or taxonomy data failed to load.</div>;

  // 10. Process downstream graph formats (using flat query path mappings)
  const nodes: GraphNode[] = cluster.members.map((m: any) => ({
    id: m.accession,
    label: m.accession,
    href: `/species/gene?id=${id}&accession=${encodeURIComponent(m.accession)}`, // 11. FIXED: Changed route format
  }));
  const edges = cluster.graph.map(([source, target, weight]: [any, any, any]) => ({ source, target, weight }));

  const sortedGo = Object.entries(cluster.all_go_terms).sort((a: any, b: any) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div>
        {/* 12. FIXED: Point back to species query landing string */}
        <Link href={`/species?id=${id}`} className="text-sm text-emerald-600 hover:underline">
          ← {id}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {cluster.title || "Untitled cluster"}
          </h1>
          {cluster.confidence && (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-500">
              {cluster.confidence} confidence
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-xs text-zinc-400">cluster {cluster.hash}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span>{cluster.size} proteins</span>
          <span>{cluster.edges} edges</span>
          <span>{cluster.triangles} triangles</span>
          <span>max degree {cluster.max_degree}</span>
        </div>
      </div>

      {cluster.description && (
        <p className="max-w-3xl leading-relaxed text-zinc-700">{cluster.description}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Interaction network
        </h2>
        {cluster.edges > 0 ? (
          <NetworkGraph nodes={nodes} edges={edges} height={480} />
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-zinc-600">
              No predicted interactions within this cluster
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Its {cluster.size} proteins were grouped functionally
              {cluster.recipe_readded.length > 0
                ? `, with ${cluster.recipe_readded.length} re-added by ReCIPE,`
                : ""}{" "}
              but PHILHARMONIC recorded no high-confidence edges between them.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            GO terms ({sortedGo.length})
          </h2>
          <Expandable initial={10}>
            {sortedGo.map(([gid, count]: [string, any]) => {
              // Look up the full name using the parsed goMap
              const termName = goMap?.[gid]?.name || null;

              return (
                <div
                  key={gid}
                  className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 text-sm"
                >
                  {/* Left group: Link ID + Gray Name descriptor */}
                  <div className="flex items-baseline gap-2 min-w-0">
                    {/* The GO ID is ALWAYS the clickable link */}
                    <a
                      href={goUrl(gid)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-medium text-emerald-700 hover:underline shrink-0"
                    >
                      {gid}
                    </a>
                    
                    {/* The full term name follows in gray if it exists */}
                    {termName && (
                      <span className="text-zinc-400 truncate text-xs" title={termName}>
                        — {termName}
                      </span>
                    )}
                  </div>

                  {/* Right group: Keep the clean occurrence count baseline metric */}
                  <span className="shrink-0 font-mono text-xs font-medium text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                    {count} {count === 1 ? 'gene' : 'genes'}
                  </span>
                </div>
              );
            })}
          </Expandable>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Proteins ({cluster.members.length})
          </h2>
          <Expandable initial={15}>
            {cluster.members.map((m: any) => (
              <div key={m.accession} className="border-b border-zinc-100 py-1.5 text-sm">
                {/* 13. FIXED: Adjusted link string formatting to match query paradigm */}
                <Link
                  href={`/species/gene?id=${id}&accession=${encodeURIComponent(m.accession)}`}
                  className="font-mono text-emerald-700 hover:underline"
                >
                  {m.accession}
                </Link>
                <span className="ml-2 text-xs text-zinc-400">
                  {m.go_terms.length} GO
                </span>
              </div>
            ))}
          </Expandable>
        </div>
      </section>

      {cluster.recipe_readded.length > 0 && (
        <p className="text-xs text-zinc-400">
          {cluster.recipe_readded.length} protein(s) re-added by ReCIPE.
        </p>
      )}
    </div>
  );
}

export default function ClusterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <ClusterContent />
    </Suspense>
  );
}

