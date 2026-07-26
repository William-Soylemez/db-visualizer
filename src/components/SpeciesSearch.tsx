"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";

interface SpeciesItem {
  id: string;
  display_name?: string;
  common_name?: string;
  lineage?: string[];
}

export interface SearchState {
  searchQuery: string;
  isSearchFocused: boolean;
  isActiveSearch: boolean;
}

interface SpeciesSearchProps {
  species: SpeciesItem[];
  onSearchStateChange?: (state: SearchState) => void;
}

export default function SpeciesSearch({
  species,
  onSearchStateChange,
}: SpeciesSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const cleanQuery = searchQuery.trim().toLowerCase();
  const isActiveSearch = isSearchFocused && cleanQuery !== "";

  // Pass comprehensive state upstream to parent whenever search state changes
  useEffect(() => {
    onSearchStateChange?.({
      searchQuery,
      isSearchFocused,
      isActiveSearch,
    });
  }, [searchQuery, isSearchFocused, isActiveSearch, onSearchStateChange]);

  // Extract unique clades from dataset for search indexing
  const allUniqueClades = useMemo(() => {
    return Array.from(
      new Set(species.flatMap((s) => s.lineage || []))
    ).map((cladeName) => {
      const totalCount = species.filter((s) => s.lineage?.includes(cladeName)).length;
      return { name: cladeName, count: totalCount };
    });
  }, [species]);

  // Filter clades and species against current query string
  const filteredClades = useMemo(() => {
    if (!cleanQuery) return [];
    return allUniqueClades.filter((c) => c.name.toLowerCase().includes(cleanQuery));
  }, [allUniqueClades, cleanQuery]);

  const filteredSpecies = useMemo(() => {
    if (!cleanQuery) return [];
    return species.filter(
      (s) =>
        s.id.toLowerCase().includes(cleanQuery) ||
        (s.common_name && s.common_name.toLowerCase().includes(cleanQuery)) ||
        (s.display_name && s.display_name.toLowerCase().includes(cleanQuery))
    );
  }, [species, cleanQuery]);

  const hasSearchResults = filteredClades.length > 0 || filteredSpecies.length > 0;

  // Highlight matching text helper with trim safety
  const highlightMatch = (text: string, search: string) => {
    const cleanSearch = search.trim();
    if (!cleanSearch) return text;

    const escapedQuery = cleanSearch.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));

    return (
      <span className="inline">
        {parts.map((part, i) =>
          part.toLowerCase() === cleanSearch.toLowerCase() ? (
            <mark
              key={i}
              className="bg-emerald-100 text-emerald-950 font-medium px-0 rounded-none inline"
            >
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
    <section className="max-w-xl space-y-2 relative">
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Search Database
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="Search by species common name, scientific name, accession, or clade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          // 200ms timeout ensures link clicks inside the dropdown register before focus is lost
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          className="w-full rounded-lg border border-zinc-200 pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
        />
        <span className="absolute left-3.5 top-2.5 text-zinc-400 font-mono text-sm pointer-events-none">
          🔍
        </span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dynamic Search Results Dropdown Overlay */}
      {isActiveSearch && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-80 overflow-y-auto divide-y divide-zinc-100">
          {!hasSearchResults && (
            <div className="p-4 text-sm text-zinc-500 italic text-center">
              No matching clades or species found for "{searchQuery}"
            </div>
          )}

          {/* Matching Clades Section */}
          {filteredClades.length > 0 && (
            <div className="p-2 bg-zinc-50/50">
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                Matching Clades
              </div>
              {filteredClades.slice(0, 5).map((clade) => (
                <Link
                  key={clade.name}
                  href={`/species-list?clade=${encodeURIComponent(clade.name)}`}
                  onClick={() => setSearchQuery("")}
                  className="flex justify-between items-center text-sm px-2 py-1.5 rounded hover:bg-zinc-200/70 text-zinc-800 hover:text-zinc-900 transition-colors duration-100"
                >
                  <span className="font-medium">
                    {highlightMatch(clade.name, searchQuery)}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {clade.count} species →
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Matching Species Section */}
          {filteredSpecies.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                Matching Species
              </div>
              {filteredSpecies.slice(0, 10).map((s) => {
                const hasCommon = s.common_name && s.common_name.trim() !== "";
                return (
                  <Link
                    key={s.id}
                    href={`/species?id=${s.id}`}
                    onClick={() => setSearchQuery("")}
                    className="block px-2 py-2 rounded hover:bg-zinc-200/70 text-left transition-colors duration-100"
                  >
                    <div className="text-sm font-medium text-zinc-900 line-clamp-1">
                      {hasCommon
                        ? highlightMatch(s.common_name!, searchQuery)
                        : highlightMatch(s.display_name || s.id, searchQuery)}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono flex gap-1.5 items-center mt-0.5">
                      <span className="uppercase">
                        {highlightMatch(s.id, searchQuery)}
                      </span>
                      {hasCommon && s.display_name && (
                        <span className="italic text-zinc-400">
                          ({highlightMatch(s.display_name, searchQuery)})
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}