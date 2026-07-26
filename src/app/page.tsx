"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { fetchSpeciesIndex } from "@/lib/data";
import SpeciesSearch from "@/components/SpeciesSearch";

interface TaxonomyNode {
  name: string;
  count: number;
  children: Record<string, TaxonomyNode>;
}

function HomeContent() {
  const [species, setSpecies] = useState<any[]>([]);
  const [taxonomyTree, setTaxonomyTree] = useState<TaxonomyNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    Eukaryota: true,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("philharmonic_tree_state");
    if (savedState) {
      try {
        setExpandedNodes(JSON.parse(savedState));
      } catch (e) {
        console.error("Failed to parse saved taxonomy tree state", e);
      }
    }

    fetchSpeciesIndex()
      .then((data) => {
        setSpecies(data);
        const root: TaxonomyNode = { name: "All", count: data.length, children: {} };

        data.forEach((item: any) => {
          if (!item.lineage || item.lineage.length === 0) return;

          let current = root;
          item.lineage.forEach((clade: string) => {
            if (!current.children[clade]) {
              current.children[clade] = { name: clade, count: 0, children: {} };
            }
            current.children[clade].count += 1;
            current = current.children[clade];
          });
        });

        setTaxonomyTree(root);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, []);

  const saveAndSetExpanded = (nextState: Record<string, boolean>) => {
    setExpandedNodes(nextState);
    localStorage.setItem("philharmonic_tree_state", JSON.stringify(nextState));
  };

  const toggleNodeWithAutoExpand = (nodeName: string, targetNode: TaxonomyNode) => {
    const next = { ...expandedNodes, [nodeName]: !expandedNodes[nodeName] };
    if (next[nodeName]) {
      let current = targetNode;
      while (Object.keys(current.children).length === 1) {
        const singleChildName = Object.keys(current.children)[0];
        next[singleChildName] = true;
        current = current.children[singleChildName];
      }
    }
    saveAndSetExpanded(next);
  };

  const RenderTaxonomyBranch = ({
    node,
    depth = 0,
  }: {
    node: TaxonomyNode;
    depth: number;
  }) => {
    const childKeys = Object.keys(node.children);
    const hasChildren = childKeys.length > 0;
    const isExpanded = expandedNodes[node.name];

    const directSpeciesMatches = !hasChildren
      ? species.filter(
          (s) => s.lineage && s.lineage[s.lineage.length - 1] === node.name
        )
      : [];

    return (
      <div className="select-none">
        <div className="flex items-center justify-between py-1.5 border-b border-zinc-100/60 hover:bg-zinc-50/50 px-2 rounded-md transition">
          <div
            className="flex items-center gap-2 cursor-pointer flex-1"
            onClick={() =>
              (hasChildren || directSpeciesMatches.length > 0) &&
              toggleNodeWithAutoExpand(node.name, node)
            }
          >
            {hasChildren || directSpeciesMatches.length > 0 ? (
              <span className="text-zinc-400 font-mono text-xs w-4">
                {isExpanded ? "▼" : "▶"}
              </span>
            ) : (
              <span className="w-4" />
            )}

            <span
              className={`text-sm ${
                hasChildren ? "font-medium text-zinc-800" : "text-zinc-700"
              }`}
            >
              {node.name}
            </span>

            <span className="text-xs bg-zinc-100 text-zinc-500 font-medium px-1.5 py-0.5 rounded-full">
              {node.count} species
            </span>
          </div>

          <Link
            href={`/species-list?clade=${encodeURIComponent(node.name)}`}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline px-2 py-1"
          >
            View list →
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4 pl-3 border-l border-zinc-200 hover:border-emerald-500 transition-colors duration-150 mt-1 space-y-1">
            {Object.values(node.children).map((childBranch) => (
              <RenderTaxonomyBranch
                key={childBranch.name}
                node={childBranch}
                depth={depth + 1}
              />
            ))}
          </div>
        )}

        {!hasChildren && isExpanded && directSpeciesMatches.length > 0 && (
          <div className="ml-4 pl-3 border-l border-zinc-200 hover:border-emerald-500 transition-colors duration-150 mt-1 space-y-1">
            {directSpeciesMatches.map((s) => {
              const hasCommon = s.common_name && s.common_name.trim() !== "";
              return (
                <Link
                  key={s.id}
                  href={`/species?id=${s.id}`}
                  className="flex items-baseline justify-between py-1 px-2 rounded hover:bg-zinc-100/70 text-left transition-colors duration-100 group"
                >
                  <div className="text-sm text-zinc-600 group-hover:text-zinc-900">
                    <span className="italic font-medium">
                      {hasCommon ? s.common_name : s.display_name}
                    </span>
                    {hasCommon && (
                      <span className="text-xs text-zinc-400 normal-case ml-2 italic">
                        ({s.display_name})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider pl-4">
                    {s.id}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading)
    return <div className="p-8 text-zinc-500">Loading species directory...</div>;
  if (error || !species)
    return (
      <div className="p-8 text-red-500">
        Failed to load the species index matrix.
      </div>
    );

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          PHILHARMONIC Database
        </h1>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-950 leading-relaxed max-w-2xl shadow-sm">
          <div className="font-semibold flex items-center gap-1.5 text-emerald-800 mb-1">
            <p>
              This project is the result of a joint AI for Science collaboration
              between MIT, Tufts, and UT Austin, funded by the National Science
              Foundation and the National Institutes of Health. Please see our{" "}
              <Link
                href="/about"
                className="text-emerald-800 underline decoration-emerald-800/40 hover:text-emerald-950 hover:decoration-emerald-950"
              >
                About page
              </Link>{" "}
              for more information.
            </p>
          </div>
        </div>

        <p className="max-w-2xl text-zinc-600 leading-relaxed">
          PHILHARMONIC predicts protein–protein interaction networks from
          sequence and decomposes them into functional clusters. Browse the
          clusters for each species, inspect their predicted functions and GO
          annotations, and drill down to individual genes.
        </p>
      </section>

      {/* Extracted Search Component */}
      <SpeciesSearch
        species={species}
        onSearchStateChange={({ isActiveSearch }) => setIsSearching(isActiveSearch)}
      />
      
      {/* Dynamic Taxonomy Browser Tree */}
      {!isSearching && (
        <section className="space-y-4 max-w-3xl">
          <div className="border-b border-zinc-200 pb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Taxonomy Browser
              </h2>
              <p className="text-xs text-zinc-500">
                Click clades to expand phylogenetic relationships. Then, view the
                list of included species in a clade.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 border-l sm:border-l-0 sm:pl-0 pl-3 border-zinc-200">
              <button
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  species.forEach((s) => {
                    s.lineage?.forEach((clade: string) => {
                      next[clade] = true;
                    });
                  });
                  saveAndSetExpanded(next);
                }}
                className="hover:text-emerald-700 hover:underline transition"
              >
                Expand All
              </button>
              <span className="text-zinc-300 pointer-events-none">|</span>
              <button
                onClick={() => {
                  saveAndSetExpanded({});
                }}
                className="hover:text-emerald-700 hover:underline transition"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            {taxonomyTree &&
              Object.values(taxonomyTree.children).map((topLevelClade) => (
                <RenderTaxonomyBranch
                  key={topLevelClade.name}
                  node={topLevelClade}
                  depth={0}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={<div className="p-8 text-zinc-500">Loading configuration...</div>}
    >
      <HomeContent />
    </Suspense>
  );
}