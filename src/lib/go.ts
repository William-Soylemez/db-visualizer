import type { GoTerm } from "./types";

/** AmiGO term page — works for any GO id, no local data needed. */
export const goUrl = (id: string) =>
  `https://amigo.geneontology.org/amigo/term/${id}`;

/** Resolve a GO id to a display name using the optional global map; falls back to the id. */
export function goName(
  id: string,
  map: Record<string, GoTerm> | null,
): string {
  return map?.[id]?.name ?? id;
}
