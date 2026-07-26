"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GoTerm, ProteinDetail } from "@/lib/types";

export type SearchMode = "all" | "protein" | "go";

export type SearchResult =
  | {
      type: "protein";
      accession: string;
      name?: string;
      clusterHash?: string | null;
    }
  | {
      type: "go";
      id: string;
      name: string;
      category?: string;
    };

export default function GeneSearch({
  speciesId,
  geneIndex,
  proteinsCatalog,
  goTermsCatalog = {},
}: {
  speciesId: string;
  geneIndex: Record<string, string | null>;
  proteinsCatalog: Record<string, ProteinDetail>;
  goTermsCatalog?: Record<string, GoTerm> | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [isFocused, setIsFocused] = useState(false);

  // Derive target key lists for memory efficiency
  const accessions = useMemo(() => Object.keys(geneIndex || {}), [geneIndex]);
  const goIds = useMemo(() => Object.keys(goTermsCatalog || {}), [goTermsCatalog]);

  // Compute matched filter results across modes
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    let proteinResults: SearchResult[] = [];
    let goResults: SearchResult[] = [];

    // 1. Search Proteins
    if (searchMode === "all" || searchMode === "protein") {
      proteinResults = accessions
        .filter((acc) => {
          if (!acc) return false;
          const proteinName = proteinsCatalog?.[acc]?.name || "";
          return acc.toLowerCase().includes(q) || proteinName.toLowerCase().includes(q);
        })
        .map((acc) => ({
          type: "protein" as const,
          accession: acc,
          name: proteinsCatalog?.[acc]?.name,
          clusterHash: geneIndex[acc],
        }));
    }

    // 2. Search GO Terms
    if (searchMode === "all" || searchMode === "go") {
      goResults = goIds
        .filter((id) => {
          if (!id) return false;
          const term = goTermsCatalog?.[id];
          const termName = term?.name || "";
          return id.toLowerCase().includes(q) || termName.toLowerCase().includes(q);
        })
        .map((id) => ({
          type: "go" as const,
          id,
          name: goTermsCatalog?.[id]?.name || id,
          category: goTermsCatalog?.[id]?.namespace,
        }));
    }

    // 3. Balance results in "All" mode
    if (searchMode === "all") {
      const pSlice = proteinResults.slice(0, 5);
      const gSlice = goResults.slice(0, 5);
      return [...pSlice, ...gSlice];
    }

    if (searchMode === "protein") return proteinResults.slice(0, 8);
    return goResults.slice(0, 8);
  }, [accessions, goIds, geneIndex, proteinsCatalog, goTermsCatalog, query, searchMode]);

  const go = (result: SearchResult) => {
    if (result.type === "protein") {
      router.push(`/species/gene?id=${speciesId}&accession=${encodeURIComponent(result.accession)}`);
    } else {
      router.push(`/species/go?id=${speciesId}&term=${encodeURIComponent(result.id)}`);
    }
  };

  const highlightMatch = (text: string, search: string) => {
    const cleanSearch = search.trim();
    if (!cleanSearch) return text;

    const escapedQuery = cleanSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));

    return (
      <span className="inline">
        {parts.map((part, i) =>
          part.toLowerCase() === cleanSearch.toLowerCase() ? (
            <mark key={i} className="bg-emerald-100 text-emerald-950 font-medium px-0 rounded-none inline">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const getPlaceholder = () => {
    switch (searchMode) {
      case "protein":
        return "Search by protein accession or name…";
      case "go":
        return "Search GO terms or IDs (e.g. GO:0008150 or kinase)…";
      default:
        return "Search proteins, accession IDs, or GO terms…";
    }
  };

  return (
    <div className="relative">
      <div className="relative flex items-center rounded-md border border-zinc-200 bg-white shadow-sm focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
        <select
          value={searchMode}
          onChange={(e) => setSearchMode(e.target.value as SearchMode)}
          className="h-full rounded-l-md border-r border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-medium text-zinc-600 outline-none hover:bg-zinc-100 focus:bg-white transition-colors cursor-pointer shrink-0"
        >
          <option value="all">All</option>
          <option value="protein">Proteins</option>
          <option value="go">GO Terms</option>
        </select>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) go(matches[0]);
          }}
          placeholder={getPlaceholder()}
          className="w-full bg-transparent pl-3 pr-14 py-2 text-sm outline-none placeholder:text-zinc-400"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 text-xs font-medium text-zinc-400 hover:text-zinc-600 transition"
          >
            Clear
          </button>
        )}
      </div>

      {isFocused && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg divide-y divide-zinc-100">
          {matches.map((item) => {
            if (item.type === "protein") {
              const clusterText = item.clusterHash ? `cluster ${item.clusterHash}` : "no cluster";

              return (
                <li key={`protein-${item.accession}`}>
                  <button
                    onClick={() => go(item)}
                    className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm hover:bg-zinc-100/80 text-zinc-800 transition-colors duration-100"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {searchMode === "all" && (
                        <span className="shrink-0 text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1 py-0.2 rounded">
                          Protein
                        </span>
                      )}
                      <span className="font-mono font-medium shrink-0">
                        {highlightMatch(item.accession, query)}
                      </span>
                      {item.name && (
                        <span className="text-zinc-400 text-xs truncate" title={item.name}>
                          — {highlightMatch(item.name, query)}
                        </span>
                      )}
                    </div>

                    <span
                      className={`shrink-0 font-mono text-xs px-1.5 py-0.5 rounded border tracking-tight ${
                        item.clusterHash
                          ? "text-zinc-400 bg-zinc-50/50 border-zinc-100"
                          : "text-zinc-400/80 bg-zinc-50/20 border-zinc-200/40 border-dashed"
                      }`}
                    >
                      {clusterText}
                    </span>
                  </button>
                </li>
              );
            }

            return (
              <li key={`go-${item.id}`}>
                <button
                  onClick={() => go(item)}
                  className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm hover:bg-zinc-100/80 text-zinc-800 transition-colors duration-100"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {searchMode === "all" && (
                      <span className="shrink-0 text-[10px] uppercase font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1 py-0.2 rounded">
                        GO Term
                      </span>
                    )}
                    <span className="font-mono text-xs font-semibold text-indigo-900 shrink-0">
                      {highlightMatch(item.id, query)}
                    </span>
                    <span className="text-zinc-600 text-xs truncate" title={item.name}>
                      — {highlightMatch(item.name, query)}
                    </span>
                  </div>

                  {item.category && (
                    <span className="shrink-0 font-sans text-[11px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                      {item.category}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}