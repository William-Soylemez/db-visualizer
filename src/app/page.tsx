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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 5. Fetch the structural species manifest once the browser mounts the view
  useEffect(() => {
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

  const toggleNode = (nodeName: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeName]: !prev[nodeName] }));
  };  

  // Recursive tree layout compiler component
  const RenderTaxonomyBranch = ({ node, depth = 0 }: { node: TaxonomyNode; depth: number }) => {
    const hasChildren = Object.keys(node.children).length > 0;
    const isExpanded = expandedNodes[node.name];

    return (
      <div className="select-none">
        <div className="flex items-center justify-between py-2 border-b border-zinc-100/60 hover:bg-zinc-50/50 px-2 rounded-md transition">
          <div 
            className="flex items-center gap-2 cursor-pointer flex-1" 
            onClick={() => hasChildren && toggleNode(node.name)}
          >
            {hasChildren ? (
              <span className="text-zinc-400 font-mono text-xs w-4">
                {isExpanded ? "▼" : "▶"}
              </span>
            ) : (
              <span className="w-4" />
            )}
            <span className={`text-sm ${hasChildren ? "font-medium text-zinc-800" : "text-zinc-600"}`}>
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
          <div className="ml-4 pl-3 border-l border-zinc-200 mt-1 space-y-1">
            {Object.values(node.children).map((childBranch) => (
              <RenderTaxonomyBranch 
                key={childBranch.name} 
                node={childBranch} 
                depth={depth + 1} 
              />
            ))}
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
            This project is the result of a joint AI for Science collaboration with the
            UT Austin, sponsored by the National Science Foundation. Please see {" "}
            <a 
              href="/about" 
              className="text-emerald-600 hover:underline"
            >
            About
            </a> for more information. 
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

      {/* Dynamic Taxonomy Browser Module Layout */}
      <section className="space-y-4 max-w-3xl">
        <div className="border-b border-zinc-200 pb-2">
          <h2 className="text-lg font-semibold text-zinc-900">Browse by Taxonomy</h2>
          <p className="text-xs text-zinc-500">Click clades to expand phylogenetic relationships.</p>
        </div>
        
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          {taxonomyTree && Object.values(taxonomyTree.children).map((topLevelClade) => (
            <RenderTaxonomyBranch key={topLevelClade.name} node={topLevelClade} depth={0} />
          ))}
        </div>
      </section>

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
