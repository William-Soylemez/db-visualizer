# PHILHARMONIC DB Visualizer

Next.js (App Router) frontend for browsing PHILHARMONIC clusters.

## Data source

`src/lib/data.ts` resolves data in one of two ways:

- **Local dev (default):** reads JSON straight off the filesystem from
  `../preprocessed_data` (override with `DATA_DIR`). No server needed.
- **Production:** set `NEXT_PUBLIC_DATA_BASE_URL` to an `http(s)://` base (e.g. the
  Cloudflare R2 public URL) and it fetches over the network instead.

Generate the local data first (from the repo root):

```bash
.venv/bin/python preprocessing/preprocess.py GCF_000002765.6 example_data/GCF_000002765.6 preprocessed_data
.venv/bin/python preprocessing/build_index.py preprocessed_data
```

## Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Routes

- `/` — species list
- `/species/[id]` — cluster-of-clusters graph, gene search, sortable cluster list
- `/species/[id]/cluster/[hash]` — cluster network, GO terms, member proteins
- `/species/[id]/gene/[accession]` — protein GO terms, Pfam, NCBI + cluster links

## Notes

- GO term **names** are resolved via an optional global `go_terms.json`
  (`preprocessing/build_go_terms.py`). Without it, GO IDs render as-is, linked to AmiGO.
- The network graphs use Cytoscape, loaded client-side only (see
  `src/components/NetworkGraph.tsx`).
