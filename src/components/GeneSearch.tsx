"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneSearch({
  speciesId,
  geneIndex,
}: {
  speciesId: string;
  geneIndex: Record<string, string>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const accessions = useMemo(() => Object.keys(geneIndex), [geneIndex]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return accessions.filter((a) => a.toLowerCase().includes(q)).slice(0, 8);
  }, [accessions, query]);

  const go = (accession: string) =>
    router.push(`/species/gene?id=${speciesId}&accession=${encodeURIComponent(accession)}`);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) go(matches[0]);
        }}
        placeholder="Search a gene / protein accession…"
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
      />
      {matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
          {matches.map((acc) => (
            <li key={acc}>
              <button
                onClick={() => go(acc)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50"
              >
                <span className="font-mono">{acc}</span>
                <span className="text-xs text-zinc-400">cluster {geneIndex[acc]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
