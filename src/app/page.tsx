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
            // Adjusted to use s.display_name from your JSON object
            const primaryName = hasCommon ? s.common_name : s.display_name;
            const subName = hasCommon ? s.display_name : s.id;

            return (
              <li key={s.id}>
                <Link
                  href={`/species/${s.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-sm h-full"
                >
                  <div className="font-semibold text-base text-zinc-900 tracking-tight line-clamp-1">
                    {primaryName}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 italic line-clamp-1">
                    {subName}
                  </div>
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
