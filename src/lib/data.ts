import type {
  ClusterDetail,
  ClusterGraph,
  ClusterSummary,
  GoTerm,
  ProteinDetail,
  SpeciesIndexEntry,
  SpeciesManifest,
} from "./types";

/**
 * Data source resolution:
 *   - If NEXT_PUBLIC_DATA_BASE_URL starts with http(s), fetch over the network
 *     (the eventual R2 / object-store setup).
 *   - Otherwise treat DATA_DIR (or the default sibling `preprocessed_data`) as a
 *     local filesystem root and read directly. This is the local-dev path.
 *
 * All loaders run in Server Components, so filesystem access is fine.
 */

const HTTP_BASE = process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "";
const USE_HTTP = /^https?:\/\//.test(HTTP_BASE);

async function getJSON<T>(relPath: string): Promise<T> {
  const clean = relPath.replace(/^\//, "");
  if (USE_HTTP) {
    const url = `${HTTP_BASE.replace(/\/$/, "")}/${clean}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
    return res.json() as Promise<T>;
  }
  // Local filesystem read (dynamic import keeps these server-only).
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const root =
    process.env.DATA_DIR ??
    path.resolve(process.cwd(), "..", "preprocessed_data");
  const full = path.join(root, clean);
  return JSON.parse(await readFile(full, "utf8")) as T;
}

/** Returns null instead of throwing when a resource is absent (e.g. go_terms.json). */
async function getJSONOptional<T>(relPath: string): Promise<T | null> {
  try {
    return await getJSON<T>(relPath);
  } catch {
    return null;
  }
}

export const fetchSpeciesIndex = () =>
  getJSON<SpeciesIndexEntry[]>("species_index.json");

export const fetchGoTerms = () =>
  getJSONOptional<Record<string, GoTerm>>("go_terms.json");

export const fetchSpeciesManifest = (id: string) =>
  getJSON<SpeciesManifest>(`species/${id}/manifest.json`);

export const fetchClusterSummaries = (id: string) =>
  getJSON<ClusterSummary[]>(`species/${id}/clusters.json`);

export const fetchClusterGraph = (id: string) =>
  getJSON<ClusterGraph>(`species/${id}/cluster_graph.json`);

export const fetchGeneIndex = (id: string) =>
  getJSON<Record<string, string>>(`species/${id}/gene_index.json`);

export const fetchClusterDetail = (id: string, hash: string) =>
  getJSON<ClusterDetail>(`species/${id}/clusters/${hash}.json`);

/** One map per species; gene pages look up in-memory. */
export const fetchProteins = (id: string) =>
  getJSON<Record<string, ProteinDetail>>(`species/${id}/proteins.json`);
