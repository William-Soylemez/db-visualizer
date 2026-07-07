"use client"; // 1. Transition the home screen from server compilation to client runtime execution

import Link from "next/link";
import { useEffect, useState, Suspense } from "react"; // 2. Add React hooks for mounting client state
import { fetchSpeciesIndex } from "@/lib/data";

interface TaxonomyNode {
  name: string;
  count: number;
  children: Record<string, TaxonomyNode>;
}

// 3. Shift the structural rendering logic into a regular sub-component
function HomeContent() {
  // 4. Set reactive state values for async lifecycle tracking
  const [species, setSpecies] = useState<any[]>([]);
  const [taxonomyTree, setTaxonomyTree] = useState<TaxonomyNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "Eukaryota": true // Start with the top level pre-expanded
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false); // New focus monitor  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 5. Fetch the structural species manifest once the browser mounts the view
  useEffect(() => {
    // check for an existing saved tree state in the browser
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
        // Build the runtime hierarchical taxonomy structure directly from data
        const root: TaxonomyNode = { name: "All", count: data.length, children: {} };
        
        data.forEach((item) => {
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

        // Set the primary curated branch point root
        setTaxonomyTree(root);        
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, []);

// Feature 1: Recursive single-child expansion engine
  const saveAndSetExpanded = (nextState: Record<string, boolean>) => {
      setExpandedNodes(nextState);
      localStorage.setItem("philharmonic_tree_state", JSON.stringify(nextState));
    };
  const toggleNodeWithAutoExpand = (nodeName: string, targetNode: TaxonomyNode) => {
      const next = { ...expandedNodes, [nodeName]: !expandedNodes[nodeName] };      
      // Only auto-expand downwards if we are *opening* the node
      if (next[nodeName]) {
        let current = targetNode;
        // Keep descending and opening as long as there is exactly one sub-clade
        while (Object.keys(current.children).length === 1) {
          const singleChildName = Object.keys(current.children)[0];
          next[singleChildName] = true;
          current = current.children[singleChildName];
        }
      }
      saveAndSetExpanded(next);
    };

  // Highlight matching text helper (Simpler, standard text flow version)
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const cleanQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${cleanQuery})`, 'gi'));
    
    return (
      <span className="inline">
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
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
    
  // Feature 2: Extract unique clades from dataset for search indices
  const allUniqueClades = Array.from(
    new Set(species.flatMap((s) => s.lineage || []))
  ).map((cladeName) => {
    const totalCount = species.filter((s) => s.lineage?.includes(cladeName)).length;
    return { name: cladeName, count: totalCount };
  });

  // Filter both groups against the current search query string
  const cleanQuery = searchQuery.trim().toLowerCase();
  
  const filteredClades = cleanQuery
    ? allUniqueClades.filter((c) => c.name.toLowerCase().includes(cleanQuery))
    : [];

  const filteredSpecies = cleanQuery
    ? species.filter(
        (s) =>
          s.id.toLowerCase().includes(cleanQuery) ||
          (s.common_name && s.common_name.toLowerCase().includes(cleanQuery)) ||
          (s.display_name && s.display_name.toLowerCase().includes(cleanQuery))
      )
    : [];

  const hasSearchResults = filteredClades.length > 0 || filteredSpecies.length > 0;

  // Recursive tree layout compiler component
  const RenderTaxonomyBranch = ({ node, depth = 0 }: { node: TaxonomyNode; depth: number }) => {
    const childKeys = Object.keys(node.children);    
    const hasChildren = childKeys.length > 0;
    const isExpanded = expandedNodes[node.name];

    // Find all leaf species belonging to this specific clade
    // We only display them if this clade has no sub-clades of its own (terminal branch)
    const directSpeciesMatches = !hasChildren
      ? species.filter((s) => s.lineage && s.lineage[s.lineage.length - 1] === node.name)
      : [];

    return (
      <div className="select-none">
        <div className="flex items-center justify-between py-1.5 border-b border-zinc-100/60 hover:bg-zinc-50/50 px-2 rounded-md transition">
          <div 
            className="flex items-center gap-2 cursor-pointer flex-1" 
            // Expand if it has child clades OR if it contains terminal species records
            onClick={() => (hasChildren || directSpeciesMatches.length > 0) && toggleNodeWithAutoExpand(node.name, node)}
          >
            {(hasChildren || directSpeciesMatches.length > 0) ? (
              <span className="text-zinc-400 font-mono text-xs w-4">
                {isExpanded ? "▼" : "▶"}
              </span>
            ) : (
              <span className="w-4" />
            )}
            
            {/* Visual Polish: Keep clades normal, but you can style text here if needed */}
            <span className={`text-sm ${hasChildren ? "font-medium text-zinc-800" : "text-zinc-700"}`}>
              {node.name}
            </span>
            
            <span className="text-xs bg-zinc-100 text-zinc-500 font-medium px-1.5 py-0.5 rounded-full">
              {node.count} {node.count === 1 ? "species" : "species"}
            </span>
          </div>

          <Link 
            href={`/species-list?clade=${encodeURIComponent(node.name)}`}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline px-2 py-1"
          >
            View list →
          </Link>
        </div>

        {/* 1. Render Sub-Clades if they exist */}
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

        {/* 2. Visual Polish: Render Actual Leaf Species directly inside the tree if expanded */}
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
                    {/* Visual Polish: Italicize the official biological name/common representation */}
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

  // 6. Handle ongoing transmission states elegantly
  if (loading) return <div className="p-8 text-zinc-500">Loading species directory...</div>;
  if (error || !species) return <div className="p-8 text-red-500">Failed to load the species index matrix.</div>;

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">PHILHARMONIC Database</h1>
        {/* Highlighted Informational Box */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-950 leading-relaxed max-w-2xl shadow-sm">
          <div className="font-semibold flex items-center gap-1.5 text-emerald-800 mb-1">
          <p>
            This project is the result of a joint AI for Science collaboration with
            UT Austin, sponsored by the National Science Foundation. Please see our {" "}
            <Link 
              href="/about" 
              className="text-emerald-800 underline decoration-emerald-800/40 hover:text-emerald-950 hover:decoration-emerald-950"
            >
            About page
            </Link> for more information. 
          </p>
          </div>
        </div>

        <p className="max-w-2xl text-zinc-600 leading-relaxed">
          PHILHARMONIC predicts protein–protein interaction networks from sequence and
          decomposes them into functional clusters. Browse the clusters for each species,
          inspect their predicted functions and GO annotations, and drill down to
          individual genes.
        </p>
      </section>

      {/* Unified Search Engine Bar */}
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
            // Wrap in a tiny timeout so that clicks on dropdown links hit the router before the dropdown vanishes
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="w-full rounded-lg border border-zinc-200 pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm"
          />
          <span className="absolute left-3.5 top-2.5 text-zinc-400 font-mono text-sm pointer-events-none">
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dynamic Search Results Dropdown Overlay */}
        {isSearchFocused && searchQuery.trim() !== "" && (
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
                    <span className="font-medium">{highlightMatch(clade.name, searchQuery)}</span>
                    <span className="text-xs text-zinc-400">{clade.count} species →</span>
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
                        {hasCommon ? highlightMatch(s.common_name, searchQuery) : highlightMatch(s.display_name, searchQuery)}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono flex gap-1.5 items-center mt-0.5">
                        <span className="uppercase">{s.id}</span>
                        {hasCommon && <span className="italic text-zinc-400">({highlightMatch(s.display_name, searchQuery)})</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Dynamic Taxonomy Browser Tree */}
      {!(isSearchFocused && searchQuery.trim() !== "") && ( //This hides the tree while the search bar is in use
        <section className="space-y-4 max-w-3xl">
          <div className="border-b border-zinc-200 pb-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Taxonomy Browser</h2>
              <p className="text-xs text-zinc-500">Click clades to expand phylogenetic relationships. Then, view the list of included species a clade.</p>
            </div>
            
            {/* Expand / Collapse Global Controls */}
            <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 border-l sm:border-l-0 sm:pl-0 pl-3 border-zinc-200">
              <button
                onClick={() => {
                  // Rebuild a flat dictionary turning EVERY unique clade to true
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
                  // Collapse everything by wiping the dictionary clean
                  saveAndSetExpanded({});
                }}
                className="hover:text-emerald-700 hover:underline transition"
              >
                Collapse All
              </button>
            </div>
          </div>
          
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
            {taxonomyTree && Object.values(taxonomyTree.children).map((topLevelClade) => (
              <RenderTaxonomyBranch key={topLevelClade.name} node={topLevelClade} depth={0} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

// 8. Default export a wrapper wrapped safely in Suspense to please the Next static export compiler
export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading configuration...</div>}>
      <HomeContent />
    </Suspense>
  );
}
