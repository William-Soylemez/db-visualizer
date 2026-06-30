import Link from "next/link";
import { fetchSpeciesIndex } from "@/lib/data";

export default async function Home() {
  const species = await fetchSpeciesIndex();

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
          {species.map((s) => (
            <li key={s.id}>
              <Link
                href={`/species/${s.id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-sm"
              >
                <div className="font-medium">{s.display_name}</div>
                <div className="mt-1 font-mono text-xs text-zinc-500">{s.id}</div>
                {s.lineage.length > 0 && (
                  <div className="mt-2 text-xs text-zinc-400">
                    {s.lineage.join(" › ")}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
