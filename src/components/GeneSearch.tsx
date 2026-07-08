"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneSearch({
  speciesId,
  geneIndex,
  proteinsCatalog, // Injected master catalog
}: {
  speciesId: string;
  geneIndex: Record<string, string | null>;
  proteinsCatalog: Record<string, { name?: string }>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Derive accessions keys directly from your lightweight mapping index
  const accessions = useMemo(() => Object.keys(geneIndex || {}), [geneIndex]);

  // Compute matched filter matches across both structural keys AND catalog names concurrently
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    
    return accessions
      .filter((acc) => {
        if (!acc) return false;
        
        const proteinName = proteinsCatalog?.[acc]?.name || "";
        const matchAccession = acc.toLowerCase().includes(q);
        const matchName = proteinName.toLowerCase().includes(q);
        
        return matchAccession || matchName;
      })
      .slice(0, 8);
  }, [accessions, proteinsCatalog, query]);

  const go = (accession: string) =>
    router.push(`/species/gene?id=${speciesId}&accession=${encodeURIComponent(accession)}`);

const highlightMatch = (text: string, search: string) => {
    // FIX: Trim whitespace from the search token to match the filter's behavior
    const cleanSearch = search.trim();
    if (!cleanSearch) return text;
    
    // Use the trimmed string to build the regex boundary safely
    const escapedQuery = cleanSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    
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

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) go(matches[0]);
          }}
          placeholder="Search by accession identifier or protein name…"
          className="w-full rounded-md border border-zinc-200 bg-white pl-3 pr-14 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
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
          {matches.map((acc) => {
            const clusterHash = geneIndex[acc];
            const clusterText = clusterHash ? `cluster ${clusterHash}` : "no cluster";
            const proteinName = proteinsCatalog?.[acc]?.name || null;

            return (
              <li key={acc}>
                <button
                  onClick={() => go(acc)}
                  className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm hover:bg-zinc-200/70 text-zinc-800 hover:text-zinc-900 transition-colors duration-100"
                >
                  {/* Left layout block: Highlights matched text inside accession and common names seamlessly */}
                  <div className="flex items-baseline gap-2 min-w-0 flex-1">
                    <span className="font-mono font-medium shrink-0">
                      {highlightMatch(acc, query)}
                    </span>
                    {proteinName && (
                      <span className="text-zinc-400 text-xs truncate" title={proteinName}>
                        — {highlightMatch(proteinName, query)}
                      </span>
                    )}
                  </div>
                  
                  {/* Right layout block: Partition tag styling fallbacks */}
                  <span className={`shrink-0 font-mono text-xs px-1.5 py-0.5 rounded border tracking-tight ${
                    clusterHash 
                      ? "text-zinc-400 bg-zinc-50/50 border-zinc-100" 
                      : "text-zinc-400/80 bg-zinc-50/20 border-zinc-200/40 border-dashed"
                  }`}>
                    {clusterText}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}