# Running preprocessing on the HPC cluster

All preprocessing logic lives in this repo under `preprocessing/`:

| File | Role |
|------|------|
| `preprocess.py` | Convert one described species' pipeline outputs → compact JSON (+ `.mfd`). |
| `medford.py` | MEDFORD metadata generation (imported by `preprocess.py`). |
| `schemas.py` | pydantic models defining the output JSON contract. |
| `build_index.py` | Aggregate every species' `manifest.json` → top-level `species_index.json`. |
| `build_go_terms.py` | One-time global GO id → name map from `go-basic.obo`. |
| `sbatch/viz_preprocess.sh` | **The bulk job** — iterates a group of species in one allocation. |

Data flow on the cluster: the philharmonic pipeline writes each species to
`$RESULTS_BASE/<ACC>_results/`; the job reads those, writes compact JSON to
`$VIZ_OUT/species/<ACC>/`, then you `rclone` `$VIZ_OUT` up to Cloudflare R2.

The job reuses the philharmonic harness (`common.sh`) for paths and helpers, so
it must run where that exists. `$RESULTS_BASE`, `$GLOBAL_LOGS`, and the shared
venv all come from `common.sh`; `VIZ_CODE` / `VIZ_OUT` are set at the top of
`viz_preprocess.sh` — point them at this repo and your desired output dir.

## 1. One-time: put this repo on the cluster

```bash
cd /work/11301/wsoylemez/vista        # wherever the philharmonic repo also lives
git clone <this-repo-url> Db-Visualizer
# or: rsync -av Db-Visualizer/ <user>@<cluster>:/work/.../vista/Db-Visualizer/
```

Confirm the two paths at the top of `preprocessing/sbatch/viz_preprocess.sh`
match your layout:
- `VIZ_CODE=/work/.../vista/Db-Visualizer/preprocessing`
- `VIZ_OUT=/work/.../vista/philharmonic_results/visualizer_data`

## 2. One-time: add the one extra dependency

The job runs on the shared philharmonic venv (via `activate_env`); the only thing
it adds beyond the stdlib is pydantic:

```bash
source /work/11301/wsoylemez/vista/venv/bin/activate
pip install pydantic
```

## 3. (Optional) launch it alongside the other sbatch jobs

The job is self-contained here, but if you prefer submitting it from the
philharmonic `sbatch_jobs/` dir like the other steps, symlink it (keeps a single
source of truth in this repo):

```bash
ln -s /work/.../vista/Db-Visualizer/preprocessing/sbatch/viz_preprocess.sh \
      /work/.../vista/philharmonic/sbatch_jobs/viz_preprocess.sh
```

## 4. Run the bulk preprocessing

Submit one job over a group of species (file or inline args):

```bash
sbatch preprocessing/sbatch/viz_preprocess.sh accessions.txt
# or
sbatch preprocessing/sbatch/viz_preprocess.sh GCF_000002765.6 GCF_000146045.2 ...
```

It skips species that aren't described yet, re-runs the described ones
(overwrites — cheap, so resubmit any time to pick up code/data changes), and
rebuilds `species_index.json` at the end. Watch progress in
`$GLOBAL_LOGS/viz_preprocess_<jobid>.out`.

Build the global GO-term map once (independent of species):

```bash
python preprocessing/build_go_terms.py "$VIZ_OUT/go_terms.json"
```

## 5. One-time: rclone → Cloudflare R2

Install rclone (no root):

```bash
mkdir -p $HOME/bin && cd /tmp
curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip
unzip rclone-current-linux-amd64.zip && mv rclone-*/rclone $HOME/bin/
chmod +x $HOME/bin/rclone
echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc && source ~/.bashrc
```

Configure the remote (`rclone config` → new remote named `r2`, storage `s3`,
provider `Cloudflare`, paste the Access Key ID / Secret / endpoint from an R2
"Object Read & Write" API token; leave region/acl blank). Verify:

```bash
rclone lsd r2:    # should list the philharmonic-db bucket
```

## 6. Upload

```bash
rclone sync "$VIZ_OUT" r2:philharmonic-db --progress --transfers=16
```

## 7. Make the bucket readable from the website

- **Quick:** R2 → bucket → Settings → enable the **r2.dev public URL**, then set
  `NEXT_PUBLIC_DATA_BASE_URL` to `https://pub-<hash>.r2.dev` in the frontend.
- **Production:** attach a custom domain and add a CORS policy allowing
  `GET`/`HEAD` from your site origin so `fetch().json()` works cross-origin.

Verify: `curl -I https://<bucket-public-url>/species_index.json` → `HTTP 200`
with `access-control-allow-origin`.

## Re-running one species

```bash
python preprocessing/preprocess.py GCF_000001215.4 \
    "$RESULTS_BASE/GCF_000001215.4_results" "$VIZ_OUT"
python preprocessing/build_index.py "$VIZ_OUT"   # refresh the index
rclone sync "$VIZ_OUT/species/GCF_000001215.4" \
    r2:philharmonic-db/species/GCF_000001215.4
```
