"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneSearch({
  speciesId,
  geneIndex,
}: {
  speciesId: string;
  geneIndex: Record<string, string>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false); // 1. Track blur/focus state
  const accessions = useMemo(() => Object.keys(geneIndex), [geneIndex]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return accessions.filter((a) => a.toLowerCase().includes(q)).slice(0, 8);
  }, [accessions, query]);

  const go = (accession: string) =>
    router.push(`/species/gene?id=${speciesId}&accession=${encodeURIComponent(accession)}`);

  // 4. Re-use your perfected rigid-box text highlighter function
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
            if (e.key === "Enter" && matches[0]) go(matches[0]);
          }}
          placeholder="Search a gene / protein accession…"
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
          {matches.map((acc) => (
            <li key={acc}>
              <button
                onClick={() => go(acc)}
                // 3. Deeper, highly-visible zinc hover mask background
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-200/70 text-zinc-800 hover:text-zinc-900 transition-colors duration-100"
              >
                <span className="font-mono">
                  {highlightMatch(acc, query)}
                </span>
                <span className="text-xs text-zinc-400">
                  cluster {geneIndex[acc]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}