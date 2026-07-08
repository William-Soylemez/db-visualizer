"use client"; // 1. Direct Next.js to parse this layout as a client view

import Link from "next/link";
import { useSearchParams } from "next/navigation"; // 2. Migrated away from notFound/params
import { useEffect, useState, Suspense } from "react"; // 3. Added hook extensions for local state
import { fetchGoTerms, fetchProteins, fetchSpeciesIndex } from "@/lib/data";
import { goName, goUrl } from "@/lib/go";
import Expandable from "@/components/Expandable";

// 4. Cleaned component configuration parameters
function GeneContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); // 5. Isolate taxonomy key (?id=)
  const rawAccession = searchParams.get("accession") || ""; // 6. Extract raw accession string (?accession=)
  const accession = decodeURIComponent(rawAccession);

  // 7. Track networking dependencies and entity responses via React states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [protein, setProtein] = useState<any>(null);
  const [goMap, setGoMap] = useState<any>(null);
  const [pfamMap, setPfamMap] = useState<Record<string, string>>({});
  const [speciesMeta, setSpeciesMeta] = useState<{ common?: string; scientific?: string } | null>(null);
  
  // 8. Execute browser fetch sequence upon interface mounting
  useEffect(() => {
    if (!id || !accession) return;

    setLoading(true);
    setError(false);

    Promise.all([fetchProteins(id), fetchGoTerms(), fetchSpeciesIndex()])
      .then(([proteinsData, goMapData, speciesIndexData]) => {
        let selectedProtein = proteinsData[accession];
        
        // TEMPORARY FALLBACK: Until the pipeline is updated, handle missing keys gracefully
        if (!selectedProtein) {
          selectedProtein = {
            accession: accession,
            ncbi_url: `https://www.ncbi.nlm.nih.gov/protein/${accession}`,
            go_terms: [],
            pfam: [],
            cluster_hash: null, // Will automatically show the cluster button once the pipeline includes this
          };
        }
        
        setProtein(selectedProtein);
        setGoMap(goMapData);

      // Resolve organism taxonomic metadata from the master species manifest
        const indexArray = speciesIndexData as any[];
        const meta = indexArray?.find((s: any) => String(s.id).trim() === String(id).trim());
        if (meta) {
          setSpeciesMeta({
            common: meta.common_name || undefined,
            scientific: meta.display_name || undefined,
          });
        } 

        setLoading(false);

        // Fetch Pfam details asynchronously only if any exist
        if (selectedProtein.pfam && selectedProtein.pfam.length > 0) {
          fetchPfamNames(selectedProtein.pfam);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [id, accession]);

  // Helper to fetch descriptive names for all Pfams on this page from InterPro
  const fetchPfamNames = async (accessions: string[]) => {
    const maps: Record<string, string> = {};
    
    await Promise.all(
      accessions.map(async (pf) => {
        try {
          const res = await fetch(`https://www.ebi.ac.uk/interpro/api/entry/pfam/${pf}/`);
          if (res.ok) {
            const data = await res.json();
            // Extract the standard name (e.g., "Zinc finger, C2H2 type")
            const name = data.metadata?.name?.name;
            if (name) maps[pf] = name;
          }
        } catch (err) {
          console.error(`Failed to fetch metadata for Pfam ${pf}:`, err);
        }
      })
    );
    
    setPfamMap(maps);
  };

  // 9. Boundary validation logic rules
  if (!id || !accession) return <div className="p-8 text-zinc-500">Missing query variables (id and accession required).</div>;
  if (loading) return <div className="p-8 text-zinc-500">Loading protein molecular metadata...</div>;
  if (error || !protein) return <div className="p-8 text-red-500">Requested protein asset details not found for this species block.</div>;

  return (
    <div className="space-y-8">
      <div>
        {/* 10. FIXED: Navigates cleanly back using parameters query structure */}
        <Link href={`/species?id=${id}`} className="text-sm text-emerald-600 hover:underline">
          ← {id}
        </Link>
        {/* Title Block: Name (Accession) */}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          {protein.name ? (
            <>
              <span className="font-sans mr-2">{protein.name}</span>
              <span className="font-mono text-xl font-normal text-zinc-500">
                ({protein.accession})
              </span>
            </>
          ) : (
            <span className="font-mono">{protein.accession}</span>
          )}
        </h1>

        {/* NEW: Fancy Species Taxonomic Sub-Header Line */}
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

        {/* Action Utility Navigation Buttons Block */}
        <div className="mt-4 flex flex-wrap gap-3 text-sm items-center">
          <a
            href={protein.ncbi_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 hover:border-emerald-400 font-medium text-zinc-700 transition-colors"
          >
            NCBI protein ↗
          </a>

          {protein.cluster_hash ? (
            <Link
              href={`/species/cluster?id=${id}&hash=${protein.cluster_hash}`}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 hover:border-emerald-400 font-medium text-zinc-700 transition-colors"
            >
              View cluster ↗
            </Link>
          ) : (
            <span className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-500 cursor-default select-none">
              Unassigned to a cluster
            </span>
          )}
        </div>
      </div>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            GO terms ({protein.go_terms.length})
          </h2>
          {protein.go_terms.length === 0 ? (
            <p className="text-sm text-zinc-400">No GO annotations.</p>
          ) : (
            <Expandable initial={15}>
              {protein.go_terms.map((gid: string) => {
                // Look up the name, default to null if not found
                const termName = goMap?.[gid]?.name || null;

                return (
                  <div key={gid} className="border-b border-zinc-100 py-1.5 text-sm flex items-baseline gap-2">
                    {/* The GO ID is ALWAYS the link */}
                    <a
                      href={goUrl(gid)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-medium text-emerald-700 hover:underline"
                    >
                      {gid}
                    </a>
                    
                    {/* The full term name follows in gray only if it exists */}
                    {termName && (
                      <span className="text-zinc-400 truncate" title={termName}>
                        — {termName}
                      </span>
                    )}
                  </div>
                );
              })}
            </Expandable>
          )}
        </div>

      {/* Updated Pfam Domains Column */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Pfam domains ({protein.pfam.length})
          </h2>
          {protein.pfam.length === 0 ? (
            <p className="text-sm text-zinc-400">No Pfam domains.</p>
          ) : (
            <div className="space-y-1">
              {protein.pfam.map((pf: string) => {
                const pfamName = pfamMap[pf] || null;

                return (
                  <div key={pf} className="border-b border-zinc-100 py-1.5 text-sm flex items-baseline gap-2">
                    {/* The Accession ID is ALWAYS the primary hyperlink */}
                    <a
                      href={`https://www.ebi.ac.uk/interpro/entry/pfam/${pf}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-medium text-emerald-700 hover:underline"
                    >
                      {pf}
                    </a>

                    {/* The descriptive name follows in gray only if fetched successfully */}
                    {pfamName && (
                      <span className="text-zinc-400 truncate text-xs" title={pfamName}>
                        — {pfamName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function GenePage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <GeneContent />
    </Suspense>
  );
}
