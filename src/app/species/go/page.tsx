"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";
import {
  fetchGoTerms,
  fetchProteins,
  fetchSpeciesIndex,
  fetchClusterSummaries,
} from "@/lib/data";
import { goUrl } from "@/lib/go";
import SpeciesSearch from "@/components/SpeciesSearch";

function GoTermContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = searchParams.get("id");
  const go = searchParams.get("go");
  const targetClusterHash = searchParams.get("hash") || searchParams.get("cluster");

  // React state hooks
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [goMap, setGoMap] = useState<Record<string, any> | null>(null);
  const [proteinsCatalog, setProteinsCatalog] = useState<Record<string, any> | null>(null);
  const [clustersMap, setClustersMap] = useState<Record<string, any>>({});
  const [speciesList, setSpeciesList] = useState<any[]>([]);
  const [speciesMeta, setSpeciesMeta] = useState<{ common?: string; scientific?: string } | null>(null);

  // Accordion state tracking which cluster sections are open
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id || !go) return;

    setLoading(true);
    setError(false);

    Promise.all([
      fetchGoTerms(),
      fetchProteins(id),
      fetchSpeciesIndex(),
      fetchClusterSummaries(id).catch(() => []),
    ])
      .then(([goData, proteinsData, speciesIndexData, clusterSummaries]) => {
        setGoMap(goData || {});
        setProteinsCatalog(proteinsData || {});

        // Build a lookup dictionary indexed by cluster hash/id
        const summaryMap: Record<string, any> = {};
        if (Array.isArray(clusterSummaries)) {
          clusterSummaries.forEach((c: any) => {
            const key = c.hash || c.id || c.cluster_hash;
            if (key) summaryMap[key] = c;
          });
        }
        setClustersMap(summaryMap);

        const indexArray = (speciesIndexData as any[]) || [];
        setSpeciesList(indexArray);

        // Resolve active species taxonomy details
        const meta = indexArray.find((s: any) => String(s.id).trim() === String(id).trim());
        if (meta) {
          setSpeciesMeta({
            common: meta.common_name || undefined,
            scientific: meta.display_name || undefined,
          });
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading GO page data:", err);
        setError(true);
        setLoading(false);
      });
  }, [id, go]);

  // 1. Extract all proteins in this species annotated with the current GO term
  const matchingProteins = useMemo(() => {
    if (!proteinsCatalog || !go) return [];
    return Object.values(proteinsCatalog).filter(
      (p: any) => p.go_terms && Array.isArray(p.go_terms) && p.go_terms.includes(go)
    );
  }, [proteinsCatalog, go]);

  // 2. Group proteins by cluster hash and sort clusters descending by protein count
  const clusterGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};

    matchingProteins.forEach((p: any) => {
      const hash = p.cluster_hash || "unassigned";
      if (!groups[hash]) groups[hash] = [];
      groups[hash].push(p);
    });

    return Object.entries(groups)
      .map(([hash, proteins]) => {
        const clusterInfo = clustersMap?.[hash] || {};
        return {
          hash,
          title:
            clusterInfo.title ||
            clusterInfo.name ||
            clusterInfo.description ||
            (hash === "unassigned" ? "Unassigned Proteins" : `Cluster ${hash}`),
          description: clusterInfo.description || clusterInfo.title || null,
          proteins,
          count: proteins.length,
        };
      })
      .sort((a, b) => {
        const aIsUnassigned = a.hash === "unassigned";
        const bIsUnassigned = b.hash === "unassigned";

        // Push unassigned to the bottom regardless of protein count
        if (aIsUnassigned && !bIsUnassigned) return 1;
        if (!aIsUnassigned && bIsUnassigned) return -1;

        // Otherwise sort assigned clusters descending by count
        return b.count - a.count;
      });
  }, [matchingProteins, clustersMap]);

  // 3. Initialize collapse/expand states based on incoming navigation target
  useEffect(() => {
    if (clusterGroups.length === 0) return;

    const initialState: Record<string, boolean> = {};
    clusterGroups.forEach((group) => {
      if (targetClusterHash) {
        // Came from a cluster or protein page: expand ONLY the targeted cluster
        initialState[group.hash] = group.hash === targetClusterHash;
      } else {
        // Direct navigation: uncollapse all by default
        initialState[group.hash] = true;
      }
    });

    setExpandedSections(initialState);
  }, [clusterGroups, targetClusterHash]);

  const allExpanded = useMemo(() => {
    return clusterGroups.length > 0 && clusterGroups.every((g) => expandedSections[g.hash]);
  }, [clusterGroups, expandedSections]);

  const toggleAll = () => {
    const newState = !allExpanded;
    const updated: Record<string, boolean> = {};
    clusterGroups.forEach((g) => {
      updated[g.hash] = newState;
    });
    setExpandedSections(updated);
  };

  const toggleSection = (hash: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [hash]: !prev[hash],
    }));
  };

  if (!id || !go) {
    return <div className="p-8 text-zinc-500">Missing required query parameters (id and go).</div>;
  }
  if (loading) return <div className="p-8 text-zinc-500">Loading GO term metadata...</div>;
  if (error || !goMap) return <div className="p-8 text-red-500">Failed to load GO term details.</div>;

  const termName = goMap[go]?.name || "GO Term Detail";

  return (
    <div className="space-y-8">
      {/* Header Block */}
      <div>
        <Link href={`/species?id=${id}`} className="text-sm text-emerald-600 hover:underline">
          ← {id}
        </Link>

        {/* Title */}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          <span>{termName}</span>{" "}
          <span className="font-mono text-xl font-normal text-zinc-500">({go})</span>
        </h1>

        {/* Taxonomy */}
        {speciesMeta && (speciesMeta.common || speciesMeta.scientific) && (
          <div className="mt-1.5 text-sm font-medium text-zinc-500">
            {speciesMeta.common && speciesMeta.scientific ? (
              <>
                {speciesMeta.common}{" "}
                <span className="italic text-zinc-400 font-normal">
                  ({speciesMeta.scientific})
                </span>
              </>
            ) : speciesMeta.scientific ? (
              <span className="italic">{speciesMeta.scientific}</span>
            ) : (
              <span>{speciesMeta.common}</span>
            )}
          </div>
        )}
        {/* AmiGO link & Species Selector */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <a
            href={goUrl(go)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md border border-zinc-200 bg-white px-3 py-1.5 hover:border-emerald-400 font-medium text-sm text-zinc-700 transition-colors"
          >
            AmiGO 2 term page ↗
          </a>

          {/* flex-1 lets this container grow to the left; max-w-md or max-w-lg keeps it comfortable on ultra-wide screens */}
          <div className="flex flex-1 items-center justify-end gap-2 text-sm text-zinc-600 max-w-lg">
            <label htmlFor="species-select" className="shrink-0 font-medium text-xs uppercase tracking-wide text-zinc-500">
            Switch species:
            </label>
            <div className="flex-1 min-w-[200px]">
              <SpeciesSearch
                species={speciesList}
                enableTaxonomy={false}
                destination="go"
                goTermId={go}
                showLabel={false}
                placeholder="Switch species..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Accordion Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Clusters with {go} ({matchingProteins.length} proteins across {clusterGroups.length} clusters)
          </h2>

          {clusterGroups.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-emerald-600 hover:underline focus:outline-none"
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>

        {clusterGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-500">
            No proteins annotated with {go} found in this species.
          </div>
        ) : (
          <div className="space-y-3">
            {clusterGroups.map((group) => {
              const isOpen = !!expandedSections[group.hash];

              return (
                <div
                  key={group.hash}
                  className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden"
                >
                  {/* Collapsible Header */}
                  <div
                    onClick={() => toggleSection(group.hash)}
                    className="flex cursor-pointer items-center justify-between gap-4 bg-zinc-50/70 px-4 py-3 hover:bg-zinc-100/80 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-zinc-400">
                        {isOpen ? "▼" : "▶"}
                      </span>
                      <div className="truncate">
                        <span className="font-medium text-zinc-800 text-sm">
                          {group.title}
                        </span>
                        {group.hash !== "unassigned" && (
                          <span className="ml-2 font-mono text-xs text-zinc-400">
                            —{" "}
                            <Link
                              href={`/species/cluster?id=${id}&hash=${group.hash}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-600 hover:underline"
                            >
                              cluster {group.hash}
                            </Link>
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 rounded border border-zinc-200 bg-white px-2 py-0.5 font-mono text-xs font-medium text-zinc-600">
                      {group.count} {group.count === 1 ? "protein" : "proteins"}
                    </span>
                  </div>

                  {/* Body */}
                  {isOpen && (
                    <div className="border-t border-zinc-100 px-4 py-2 divide-y divide-zinc-100">
                      {group.proteins.map((p: any) => (
                        <div key={p.accession} className="py-2 text-sm flex items-baseline gap-3">
                          <Link
                            href={`/species/gene?id=${id}&accession=${encodeURIComponent(p.accession)}`}
                            className="font-mono font-medium text-emerald-700 hover:underline shrink-0"
                          >
                            {p.accession}
                          </Link>
                          {p.name && (
                            <span className="text-zinc-600 text-xs truncate">
                              — {p.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function GoTermPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <GoTermContent />
    </Suspense>
  );
}