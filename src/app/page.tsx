"use client"; // 1. Transition the home screen from server compilation to client runtime execution

import Link from "next/link";
import { useEffect, useState, Suspense } from "react"; // 2. Add React hooks for mounting client state
import { fetchSpeciesIndex } from "@/lib/data";

// 3. Shift the structural rendering logic into a regular sub-component
function HomeContent() {
  // 4. Set reactive state values for async lifecycle tracking
  const [species, setSpecies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 5. Fetch the structural species manifest once the browser mounts the view
  useEffect(() => {
    fetchSpeciesIndex()
      .then((data) => {
        setSpecies(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, []);

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

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Species ({species.length})
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {species.map((s) => {
            const hasCommon = s.common_name && s.common_name.trim() !== "";
            const primaryName = hasCommon ? s.common_name : s.display_name;
            const subName = hasCommon ? s.display_name : s.id;

            return (
              <li key={s.id}>
                <Link
                  // FIX: Restored static deployment safe URL-query parameter structure (?id=)
                  href={`/species?id=${s.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-sm h-full"
                >
                  {/* Big Text: Common Name (or Display Name if missing) */}
                  <div className="font-semibold text-base text-zinc-900 tracking-tight line-clamp-1">
                    {primaryName}
                  </div>
                  {/* Little Text: Display/Scientific Name (or Accession ID if missing) */}
                  <div className="mt-0.5 text-xs text-zinc-500 italic line-clamp-1">
                    {subName}
                  </div>
                  {/* Accession ID footprint label when common name is showing */}
                  {hasCommon && (
                    <div className="mt-2 font-mono text-[10px] text-zinc-400 tracking-wider uppercase">
                      {s.id}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
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
