"use client"; // 1. Direct Next.js to parse this layout as a client view

import Link from "next/link";
import { useSearchParams } from "next/navigation"; // 2. Migrated away from notFound/params
import { useEffect, useState, Suspense } from "react"; // 3. Added hook extensions for local state
import { fetchGoTerms, fetchProteins } from "@/lib/data";
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

  // 8. Execute browser fetch sequence upon interface mounting
  useEffect(() => {
    if (!id || !accession) return;

    setLoading(true);
    setError(false);

    Promise.all([fetchProteins(id), fetchGoTerms()])
      .then(([proteinsData, goMapData]) => {
        const selectedProtein = proteinsData[accession];
        if (!selectedProtein) {
          setError(true);
        } else {
          setProtein(selectedProtein);
          setGoMap(goMapData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [id, accession]);

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
        <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight">
          {protein.accession}
        </h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <a
            href={protein.ncbi_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 hover:border-emerald-400"
          >
            NCBI protein ↗
          </a>
          {/* 11. FIXED: Point cluster lookups directly to matching static query route */}
          {protein.cluster_hash && (
            <Link
              href={`/species/cluster?id=${id}&hash=${protein.cluster_hash}`}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 hover:border-emerald-400"
            >
              View cluster ↗
            </Link>
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
              {protein.go_terms.map((gid: string) => (
                <div key={gid} className="border-b border-zinc-100 py-1.5 text-sm">
                  <a
                    href={goUrl(gid)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:underline"
                  >
                    {goName(gid, goMap)}
                  </a>
                  <span className="ml-2 font-mono text-xs text-zinc-400">{gid}</span>
                </div>
              ))}
            </Expandable>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Pfam domains ({protein.pfam.length})
          </h2>
          {protein.pfam.length === 0 ? (
            <p className="text-sm text-zinc-400">No Pfam domains.</p>
          ) : (
            <ul className="space-y-1.5">
              {protein.pfam.map((pf: string) => (
                <li key={pf}>
                  <a
                    href={`https://www.ebi.ac.uk/interpro/entry/pfam/${pf}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm text-emerald-700 hover:underline"
                  >
                    {pf} ↗
                  </a>
                </li>
              ))}
            </ul>
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
