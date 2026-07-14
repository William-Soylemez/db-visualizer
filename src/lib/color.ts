// Cluster coloring is driven by the LLM-annotated cluster name: a small set of
// broad functional themes, matched by regex. A cluster whose name hits several
// themes gets a pie-split node; "Unknown" (the LLM's own no-annotation label)
// and "Other" (no theme matched) are dedicated catch-alls.

export type ClusterCategory = {
  key: string;
  label: string;
  color: string;
  // Undefined for the synthetic Unknown / Other buckets.
  test?: RegExp;
};

// Ordered — determines pie-slice order and legend order.
export const CLUSTER_CATEGORIES: ClusterCategory[] = [
  {
    key: "metabolism",
    label: "Metabolism / Mitochondria",
    color: "#f59e0b", // amber
    test: /mitochondri|metaboli|respirat|oxidative phosphor|bioenerg/i,
  },
  {
    key: "cell_cycle",
    label: "Replication / Cell cycle",
    color: "#3b82f6", // blue
    test: /replicat|cell[\s-]?cycle|mitos|mitotic|meios|cytokinesis/i,
  },
  {
    key: "development",
    label: "Development / Differentiation",
    color: "#ec4899", // pink
    test: /develop|differentiat|morphogen|embryo/i,
  },
  {
    key: "transport",
    label: "Transport / Channels",
    color: "#06b6d4", // cyan
    test: /channel|transport|traffick|secret|permease|import|export/i,
  },
  {
    key: "chromatin",
    label: "Chromatin / Transcription",
    color: "#8b5cf6", // violet
    test: /chromatin|transcript|histone|nucleosome|epigenet/i,
  },
  {
    key: "translation",
    label: "Folding / Translation",
    color: "#22c55e", // green
    test: /folding|\bfold\b|translat|ribosom|chaperon|proteostasis/i,
  },
  {
    key: "immune",
    label: "Immune / Inflammation",
    color: "#ef4444", // red
    test: /immun|inflamm|defense|antivir|interferon|cytokine/i,
  },
];

export const UNKNOWN_CATEGORY: ClusterCategory = {
  key: "unknown",
  label: "Unknown",
  color: "#d4d4d8", // light gray — LLM produced no annotation
};

export const OTHER_CATEGORY: ClusterCategory = {
  key: "other",
  label: "Other",
  color: "#78716c", // stone — annotated but no theme matched
};

// Every category, in legend order.
export const ALL_CATEGORIES: ClusterCategory[] = [
  ...CLUSTER_CATEGORIES,
  UNKNOWN_CATEGORY,
  OTHER_CATEGORY,
];

const BY_KEY: Record<string, ClusterCategory> = Object.fromEntries(
  ALL_CATEGORIES.map((c) => [c.key, c]),
);

/**
 * Category keys matched by a cluster name.
 * - Empty / "unknown" names -> ["unknown"].
 * - Otherwise every matching theme, in CLUSTER_CATEGORIES order.
 * - No theme matched -> ["other"].
 */
export function categorizeCluster(name: string | null | undefined): string[] {
  const n = (name ?? "").trim();
  if (!n || /unknown/i.test(n)) return [UNKNOWN_CATEGORY.key];
  const hits = CLUSTER_CATEGORIES.filter((c) => c.test!.test(n)).map((c) => c.key);
  return hits.length ? hits : [OTHER_CATEGORY.key];
}

/** Slice colors for a cluster name, ready to hand to a pie-style node. */
export function categoryColors(name: string | null | undefined): string[] {
  return categorizeCluster(name).map((k) => BY_KEY[k].color);
}
