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
  enableTaxonomy?: boolean;
  destination?: "species" | "go";
  goTermId?: string;
  placeholder?: string;
  showLabel?: boolean;
}

export default function SpeciesSearch({
  species,
  onSearchStateChange,
  enableTaxonomy = true,
  destination = "species",
  goTermId,
  placeholder,
  showLabel = true,
}: SpeciesSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const cleanQuery = searchQuery.trim().toLowerCase();
  const isActiveSearch = isSearchFocused && cleanQuery !== "";

  // 1. Always keep species sorted alphabetically by scientific / display name
  const sortedSpecies = useMemo(() => {
    return [...species].sort((a, b) => {
      const nameA = a.display_name || a.id;
      const nameB = b.display_name || b.id;
      return nameA.localeCompare(nameB);
    });
  }, [species]);

  // Pass state upstream whenever search state changes
  useEffect(() => {
    onSearchStateChange?.({
      searchQuery,
      isSearchFocused,
      isActiveSearch,
    });
  }, [searchQuery, isSearchFocused, isActiveSearch, onSearchStateChange]);

  // 2. Extract unique clades (skipped if enableTaxonomy is false)
  const allUniqueClades = useMemo(() => {
    if (!enableTaxonomy) return [];
    return Array.from(
      new Set(sortedSpecies.flatMap((s) => s.lineage || []))
    ).map((cladeName) => {
      const totalCount = sortedSpecies.filter((s) => s.lineage?.includes(cladeName)).length;
      return { name: cladeName, count: totalCount };
    });
  }, [sortedSpecies, enableTaxonomy]);

  // Filter clades and species against current query string
  const filteredClades = useMemo(() => {
    if (!enableTaxonomy || !cleanQuery) return [];
    return allUniqueClades.filter((c) => c.name.toLowerCase().includes(cleanQuery));
  }, [allUniqueClades, cleanQuery, enableTaxonomy]);

  const filteredSpecies = useMemo(() => {
    if (!cleanQuery) return [];
    return sortedSpecies.filter(
      (s) =>
        s.id.toLowerCase().includes(cleanQuery) ||
        (s.common_name && s.common_name.toLowerCase().includes(cleanQuery)) ||
        (s.display_name && s.display_name.toLowerCase().includes(cleanQuery))
    );
  }, [sortedSpecies, cleanQuery]);

  const hasSearchResults = filteredClades.length > 0 || filteredSpecies.length > 0;

  // Build target href based on destination prop
  const getSpeciesHref = (s: SpeciesItem) => {
    if (destination === "go" && goTermId) {
      return `/species/go?id=${s.id}&go=${encodeURIComponent(goTermId)}`;
    }
    return `/species?id=${s.id}`;
  };

  // Highlight matching text helper
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

  const defaultPlaceholder = enableTaxonomy
    ? "Search by species common name, scientific name, accession, or clade..."
    : "Search by species common name, scientific name, or accession...";

  return (
    <section className="w-full space-y-2 relative">
      {showLabel && (
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Search Database
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder || defaultPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          className="w-full rounded-lg border border-zinc-200 pl-10 pr-10 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
        />
        <span className="absolute left-3.5 top-2.5 text-zinc-400 font-mono text-sm pointer-events-none">
          🔍
        </span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 text-xs font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dynamic Search Results Dropdown Overlay */}
      {isActiveSearch && (
        <div className="absolute left-0 z-20 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-80 overflow-y-auto divide-y divide-zinc-100">
          {!hasSearchResults && (
            <div className="p-4 text-sm text-zinc-500 italic text-center">
              No matching species {enableTaxonomy ? "or clades" : ""} found for &ldquo;{searchQuery}&rdquo;
            </div>
          )}

          {/* Matching Clades Section (Disabled if enableTaxonomy={false}) */}
          {enableTaxonomy && filteredClades.length > 0 && (
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
              {enableTaxonomy && (
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                  Matching Species
                </div>
              )}
              {filteredSpecies.slice(0, 10).map((s) => {
                const hasCommon = s.common_name && s.common_name.trim() !== "";
                return (
                  <Link
                    key={s.id}
                    href={getSpeciesHref(s)}
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