import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchClusterDetail, fetchGoTerms } from "@/lib/data";
import { goName, goUrl } from "@/lib/go";
import NetworkGraph, { type GraphNode } from "@/components/NetworkGraph";
import Expandable from "@/components/Expandable";

export default async function ClusterPage({
  params,
}: {
  params: Promise<{ id: string; hash: string }>;
}) {
  const { id, hash } = await params;

  let cluster, goMap;
  try {
    [cluster, goMap] = await Promise.all([fetchClusterDetail(id, hash), fetchGoTerms()]);
  } catch {
    notFound();
  }

  const nodes: GraphNode[] = cluster.members.map((m) => ({
    id: m.accession,
    label: m.accession,
    href: `/species/${id}/gene/${encodeURIComponent(m.accession)}`,
  }));
  const edges = cluster.graph.map(([source, target, weight]) => ({ source, target, weight }));

  const sortedGo = Object.entries(cluster.all_go_terms).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/species/${id}`} className="text-sm text-emerald-600 hover:underline">
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
            {sortedGo.map(([gid, count]) => (
              <div
                key={gid}
                className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-1.5 text-sm"
              >
                <a
                  href={goUrl(gid)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 hover:underline"
                >
                  {goName(gid, goMap)}
                </a>
                <span className="shrink-0 font-mono text-xs text-zinc-400">
                  {gid} · {count}
                </span>
              </div>
            ))}
          </Expandable>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Proteins ({cluster.members.length})
          </h2>
          <Expandable initial={15}>
            {cluster.members.map((m) => (
              <div key={m.accession} className="border-b border-zinc-100 py-1.5 text-sm">
                <Link
                  href={`/species/${id}/gene/${encodeURIComponent(m.accession)}`}
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
