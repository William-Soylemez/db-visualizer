"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// Updated type mapping structure to support the enriched master object structure
interface ProteinRecord {
  accession: string;
  name?: string;
  cluster_hash: string | null;
}

export default function GeneSearch({
  speciesId,
  geneIndex,
}: {
  speciesId: string;
  geneIndex: Record<string, ProteinRecord>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false); // 1. Track blur/focus state

  // Convert dictionary into a flat, predictable lookup list
  const proteinsList = useMemo(() => Object.values(geneIndex || {}), [geneIndex]);

  // Compute matched filters against both accession IDs AND human-readable functional names
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    
    return proteinsList
      .filter((p) => {
        const matchAccession = p.accession.toLowerCase().includes(q);
        const matchName = p.name ? p.name.toLowerCase().includes(q) : false;
        return matchAccession || matchName;
      })
      .slice(0, 8); // Preserve responsive slicing boundary limits
  }, [proteinsList, query]);

  const go = (accession: string) =>
    router.push(`/species/gene?id=${speciesId}&accession=${encodeURIComponent(accession)}`);

  // 4. Re-use your perfected rigid-box text highlighter function (Unchanged)
  const highlightMatch = (text: string, search: string) => {
    if (!search) return text;
    const cleanQuery = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${cleanQuery})`, 'gi'));
    
    return (
      <span className="inline">
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() ? (
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
          // 1. Chrome-style blur behavior with small timeout to allow link routing register
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) go(matches[0].accession);
          }}
          placeholder="Search by accession identifier or protein name…"
          className="w-full rounded-md border border-zinc-200 bg-white pl-3 pr-14 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
        />
        
        {/* 2. Interactive explicit clear button utility */}
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

      {/* 1. Only mount the drop-down if the field is explicitly focused */}
      {isFocused && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg divide-y divide-zinc-100">
          {matches.map((p) => (
            <li key={p.accession}>
              <button
                onClick={() => go(p.accession)}
                // 3. Deeper, highly-visible zinc hover mask background
                className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-sm hover:bg-zinc-200/70 text-zinc-800 hover:text-zinc-900 transition-colors duration-100"
              >
                {/* Left Layout Container: Highlights match on Accession AND text-truncated Name fields */}
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <span className="font-mono font-medium shrink-0">
                    {highlightMatch(p.accession, query)}
                  </span>
                  {p.name && (
                    <span className="text-zinc-400 text-xs truncate" title={p.name}>
                      — {highlightMatch(p.name, query)}
                    </span>
                  )}
                </div>

                {/* Right Layout Container: Evaluates cluster assignments using explicit fallback states */}
                <span className={`shrink-0 font-mono text-xs px-1.5 py-0.5 rounded border tracking-tight ${
                  p.cluster_hash 
                    ? "text-zinc-400 bg-zinc-50/50 border-zinc-100" 
                    : "text-zinc-400/80 bg-zinc-50/20 border-zinc-200/40 border-dashed"
                }`}>
                  {p.cluster_hash ? `cluster ${p.cluster_hash}` : "no cluster"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}