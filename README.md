# PHILHARMONIC DB Visualizer

Next.js (App Router) frontend for browsing PHILHARMONIC clusters.

## Repo layout

The preprocessing code (`preprocessing/`) lives in this repo. The bulk inputs and
generated outputs deliberately live **one level up, outside the repo**, so they
aren't committed:

```
<workdir>/
  db-visualizer/       ← this repo (frontend + preprocessing/)
  example_data/        ← raw per-species pipeline outputs (not committed)
  preprocessed_data/   ← generated compact JSON the frontend reads (not committed)
  .venv/               ← python venv for preprocessing (not committed)
```

## Data source

`src/lib/data.ts` resolves data in one of two ways:

- **Local dev (default):** reads JSON straight off the filesystem from
  `../preprocessed_data` (override with `DATA_DIR`). No server needed.
- **Production:** set `NEXT_PUBLIC_DATA_BASE_URL` to an `http(s)://` base (e.g. the
  Cloudflare R2 public URL) and it fetches over the network instead.

Generate the local data first — run from the **workdir** (the parent of this repo,
where `example_data/`, `preprocessed_data/`, and `.venv/` live):

```bash
.venv/bin/python db-visualizer/preprocessing/preprocess.py GCF_000002765.6 example_data/GCF_000002765.6 preprocessed_data
.venv/bin/python db-visualizer/preprocessing/build_index.py preprocessed_data
```

For the bulk cluster job and full setup, see `preprocessing/cluster_setup.md`.

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
