"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchSpeciesIndex } from "@/lib/data";

function SpeciesListContent() {
  const searchParams = useSearchParams();
  const cladedFilter = searchParams.get("clade");

  const [species, setSpecies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  if (loading) return <div className="p-8 text-zinc-500">Loading species directory...</div>;
  if (error || !species) return <div className="p-8 text-red-500">Failed to load the species index matrix.</div>;

  // Filter species dynamically if a clade URL argument exists
  const filteredSpecies = cladedFilter
    ? species.filter((s) => s.lineage && s.lineage.includes(cladedFilter))
    : species;

  return (
    <div className="space-y-6">
      {/* Dynamic Navigation Back Row */}
      <div>
        <Link href="/" className="text-sm text-emerald-600 hover:underline inline-flex items-center gap-1">
          ← Back to taxonomy browser
        </Link>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {cladedFilter ? `Clade: ${cladedFilter}` : "All Species Directory"}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Showing {filteredSpecies.length} of {species.length} total species
          </p>
        </div>
        {cladedFilter && (
          <Link
            href="/species-list"
            className="self-start sm:self-center px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-md transition"
          >
            ✕ Clear Clade Filter
          </Link>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSpecies.map((s) => {
          const hasCommon = s.common_name && s.common_name.trim() !== "";
          const primaryName = hasCommon ? s.common_name : s.display_name;

          return (
            <li key={s.id}>
              <Link
                href={`/species?id=${s.id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-sm h-full flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold text-base text-zinc-900 tracking-tight line-clamp-1">
                    {primaryName}
                  </div>
                  {hasCommon && (
                    <div className="mt-0.5 text-xs text-zinc-500 italic line-clamp-1">
                      {s.display_name}
                    </div>
                  )}
                </div>
                <div className="mt-2 font-mono text-[10px] text-zinc-400 tracking-wider uppercase">
                  {s.id}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SpeciesList() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading dynamic configurations...</div>}>
      <SpeciesListContent />
    </Suspense>
  );
}