import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchGoTerms, fetchProteins } from "@/lib/data";
import { goName, goUrl } from "@/lib/go";
import Expandable from "@/components/Expandable";

export default async function GenePage({
  params,
}: {
  params: Promise<{ id: string; accession: string }>;
}) {
  const { id, accession: raw } = await params;
  const accession = decodeURIComponent(raw);

  let proteins, goMap;
  try {
    [proteins, goMap] = await Promise.all([fetchProteins(id), fetchGoTerms()]);
  } catch {
    notFound();
  }
  const protein = proteins[accession];
  if (!protein) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/species/${id}`} className="text-sm text-emerald-600 hover:underline">
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
          {protein.cluster_hash && (
            <Link
              href={`/species/${id}/cluster/${protein.cluster_hash}`}
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
              {protein.go_terms.map((gid) => (
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
              {protein.pfam.map((pf) => (
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
