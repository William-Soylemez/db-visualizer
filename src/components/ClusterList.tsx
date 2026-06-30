"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ClusterSummary } from "@/lib/types";

type SortKey = "size" | "function" | "coherence";

const CONFIDENCE_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1, "": 0 };

export default function ClusterList({
  speciesId,
  clusters,
}: {
  speciesId: string;
  clusters: ClusterSummary[];
}) {
  const [sort, setSort] = useState<SortKey>("size");
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? clusters.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            (c.top_function ?? "").toLowerCase().includes(q),
        )
      : clusters;
    const copy = [...filtered];
    if (sort === "size") copy.sort((a, b) => b.size - a.size);
    else if (sort === "function")
      copy.sort((a, b) => (a.top_function ?? "~").localeCompare(b.top_function ?? "~"));
    else if (sort === "coherence")
      copy.sort(
        (a, b) =>
          (CONFIDENCE_RANK[b.confidence] ?? 0) - (CONFIDENCE_RANK[a.confidence] ?? 0) ||
          b.size - a.size,
      );
    return copy;
  }, [clusters, sort, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter clusters by name or function…"
          className="flex-1 min-w-60 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-500">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="size">Size</option>
            <option value="function">Function</option>
            <option value="coherence">Confidence</option>
          </select>
        </label>
      </div>

      <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {sorted.map((c) => (
          <li key={c.hash}>
            <Link
              href={`/species/${speciesId}/cluster/${c.hash}`}
              className="flex items-start gap-4 px-4 py-3 transition hover:bg-zinc-50"
            >
              <div className="mt-0.5 shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {c.size}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {c.title || <span className="text-zinc-400">Untitled cluster</span>}
                  </span>
                  {c.confidence && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                      {c.confidence}
                    </span>
                  )}
                </div>
                {c.top_function && (
                  <div className="text-xs text-zinc-500">{c.top_function}</div>
                )}
                {c.description && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-zinc-600">
                    {c.description}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-400">
            No clusters match “{query}”.
          </li>
        )}
      </ul>
    </div>
  );
}
