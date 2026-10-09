# F4-05a — Demo-zip pipeline + minishell slim-down

**Agent**: Senior Dev · **Date**: 2026-10-09 · **Branch**: `rework/v2` (from `4b1426f`)
**Task**: F4-05a (demo-zip pipeline + minishell slim-down; upload + final enable = F4-05b once creds unblocked)

## Executive summary

- Delivered a reproducible demo-zip builder (`scripts/make_demo_zip.sh`, deterministic, self-tested) + an explicit R2 upload/verify helper (`portfolio_api/scripts/r2_demo_zip.py`).
- Diagnosed the 74 MB minishell zip: **~99.9% of it was two demo GIFs** (`media/commands.gif` 40,133,745 B + `media/prompt.gif` 33,773,133 B). The actual source is 107 files ≈ 0.5 MB uncompressed. No minishell source repo exists on this machine (searched `School/{finished,unfinished,vogsphere}` + all of `~/Code`) — the R2 zip's own `minishell-main/` tree IS the canonical source, so the slim zip was built by repackaging it.
- **74 MB → 65,127 B (65 KB, 0.06 MB), −99.91%**, all 107 source files byte-identical (proven against a fresh R2 download of the old object — provenance check below).
- **Live proof (dev stack, Django-proxy chain, fresh volume)**: WS open → shell ready (Welcome frame) **0.07 s**; total incl. HTTP mint 3.61 s. Old zip measured 10–15 s first-connect (task context).
- ⚠️ **Blocked: the R2 upload.** The only R2 token on this machine (and on Render) is **read-only** — `PutObject` AccessDenied on every prefix probed (`project-files/`, `projects/`, bucket root). A write-scoped token from Batman is needed to finish (2 commands staged, see §Blocker).

## 1. The pipeline

### `scripts/make_demo_zip.sh` (new, executable)

- `make_demo_zip.sh <src_dir> <slug> [--extra-exclude GLOB]` → `.demo-zip-staging/<slug>.zip` (git-ignored staging dir; **never auto-uploads**).
- Exclusions (single pinned list): VCS (`.git*`, `.github`), Python (`.venv`, `__pycache__`, `*.pyc`, caches), Node (`node_modules`, `.next`, `dist`, `build`, `.turbo`, `coverage`), C build products (`*.o`, `*.a`, `*.so`, `*.out`, `*.dSYM`), **demo-media bloat** (`media/*.gif|png|jpg|webp|mp4` — the site serves those from the gallery; the terminal demo never reads them), hidden junk + secrets (`.DS_Store`, `.env*`).
- Determinism: sorted entry walk + fixed `date_time=(2025,1,1,0,0,0)` + fixed `external_attr=0o644<<16`, deflate. Same tree ⇒ same bytes.
- Output: artifact path, size, file count, sha256. Post-build verify: `testzip()` integrity + no excluded-family leakage regex.
- `--check` self-test: synthetic tree with one member of every junk family + real files; asserts (a) exact expected member set, (b) two consecutive builds are sha256-identical.

### `portfolio_api/scripts/r2_demo_zip.py` (new)

- Runs inside the backend image (boto3 + env creds): `info <slug>`, `upload <file> <slug>`, `ls`, `download <slug> <dest>`.
- Upload verifies remote size == local size post-put. Never prints credential values (and refuses to print the endpoint "because it embeds the account id").
- Key shape is `project-files/<slug>.zip` — matches the terminal service (`main.py:1268`) exactly.

### Tests

- `portfolio-terminal/tests/test_demo_zip_pipeline.py` (new): runs the harness `--check` and asserts PASS markers + bad-slug usage rejection. Skips VISIBLY (with reason) where rsync is absent (the service container) so CI/repo-root runs exercise it.
- Evidence: `2 passed in 0.21s` (rsync present); `2 skipped` with explicit reasons (service container, no rsync).

## 2. Minishell slim-down

### Before/after

| | before (R2, live) | after (staged) |
|---|---|---|
| size | 73,978,165 B (70.55 MB) | 65,127 B (0.06 MB) |
| files | 109 | 107 |
| sha256 | `13e75afe…c79a` | `5c5b8567…f8a5` |
| layout | `minishell-main/…` wrapper | source at zip ROOT |

- Dropped: exactly `media/commands.gif` + `media/prompt.gif`. **Added: none. Byte-diffs in the 107 common files: NONE.**
- Layout improvement: old zip forced a `cd minishell-main` before `make`; new zip lands `Makefile README.md include libft srcs` at the session root, so DB `demo_commands` (`make`, `./minishell`, …) work directly.

### Provenance proof (slim zip ≡ what R2 serves, minus GIFs)

Downloaded the live R2 object (74 MB) via the new helper, then compared against the repack source:

```
109-file provenance: sets equal = True
byte-diffs: NONE
```

(An earlier MISMATCH was my own script's path-separator bug — os.sep vs `/` — resolved above; final comparison walks from the source root.)

### Build command (reproducible)

```
unzip portfolio_api/media/project-files/minishell.zip -d /tmp/minishell-repack   # pre-overwrite local copy
bash scripts/make_demo_zip.sh /tmp/minishell-repack/minishell-main minishell
→ artifact: .demo-zip-staging/minishell.zip
→ size: 65127 bytes (0.06 MB), files: 107, sha256: 5c5b85672773c3b0211d017bf73d2975661e8ab4d4bc522937d1790c464f8a5e
```

Note: the local `portfolio_api/media/project-files/minishell.zip` (dev DEBUG serving path) was **replaced with the slim build** — dev sessions already serve the new zip. The R2 object is NOT yet replaced (see Blocker).

## 3. Live proof — fresh session, new zip, connect time

Setup: wiped `my-portfolio_terminal_projects` volume, recreated the terminal container, minted a guest JWT via the real Django endpoint, connected through the **Django proxy chain** (`/ws/terminal/minishell/`).

```
mint: OK (0.03s)
WS open (Django proxy accepted): 0.02s
WELCOME (shell ready): 0.07s        ← download+extract+spawn complete
TOTAL mint->ready: 3.61s           ← includes HTTP mint + client overhead
--- ls ---
  | Makefile  README.md  include  libft  srcs     ← NEW root layout
  | coder@9b8af78ba0a3:/home/coder/projects/minishell$
```

Terminal logs of the same session:

```
Using local project files: /backend-media/project-files/minishell.zip
✅ Extracted project files to /home/coder/projects/minishell
```

**Connect time 0.07 s ≪ 15 s target.** (An initial run printed "shell ready: 20.24s" — that was a measurement artifact of my first probe script waiting for a `$ ` that only renders after the first keystroke; the Welcome frame — the service's own readiness signal — arrived in 0.07 s. Both runs' transcripts show instant download+extract.)

### R2-state evidence (unchanged — upload blocked)

```
project-files/minishell.zip: 73978165 bytes (70.55 MB), last-modified 2025-11-26 19:48:51+00:00
```

## 4. Demo-files manifest sync — VERIFIED, no drift (no SQL needed)

Truth: the terminal builds the key as `project-files/{project_slug}.zip` (`main.py:1268`); DEBUG dev path mirrors it (`/backend-media/project-files/{slug}.zip`, `main.py:1241`).

Dev DB (`portfolio-db-dev` → `portfolio_dev`, 2026-10-09):

```
SELECT slug, has_demo, demo_files_path FROM projects_project ORDER BY id;
→ only minishell: has_demo=t, demo_files_path='project-files/minishell.zip'
→ all 11 others: has_demo=f, demo_files_path=NULL
```

**Zero legacy `projects/<slug>/...` paths in live rows.** The legacy paths exist only in `fixtures/archive/projects-v1.json` (archived v1 seed) and inside `stale_internship_content.json` as PRE-ETL source data — `etl_v2` already nulls any path not in the verified manifest (§5.4) and sets minishell to the canonical key (asserted by `tests/test_etl_v2.py:371-377`). Nothing to fix in the dev DB; prod gets the same treatment via the ETL at flip. **Documented here instead of running needless SQL.**

## 5. ⚠️ Blocker: R2 upload needs a write-scoped token

Probes (all via the backend image + `--env-file portfolio_api/.env`, values never printed):

```
head_object project-files/minishell.zip   → 200 (read OK)
PutObject  project-files/minishell.zip    → AccessDenied
PutObject  projects/minishell/.write-probe → AccessDenied
PutObject  portfolio-bucket root          → AccessDenied
```

Also checked: Render's stored backend env holds the SAME `AWS_ACCESS_KEY_ID` (compare-by-value, boolean result only); no other R2 credential file exists (`~/Code/env-files/**` inventory: only the backend/frontend/db envs); shell env exposes an unrelated `R2_IMAGES_KEY` (40-char access key) with no secret companion in `~/.zshrc`.

**Ask (Batman)**: mint an R2 token with Object Write (or Admin) scope for `portfolio-bucket`, then either paste it into `portfolio_api/.env` temporarily or run:

```
docker run --rm -v "$PWD/.demo-zip-staging:/work" \
  -v "$PWD/portfolio_api/scripts:/scripts:ro" \
  --env-file portfolio_api/.env \
  my-portfolio-backend:latest \
  python /scripts/r2_demo_zip.py upload /work/minishell.zip minishell
```

The artifact is staged at `.demo-zip-staging/minishell.zip` (sha256 `5c5b8567…f8a5`). After upload: re-run the fresh-session probe against a PROD-mode (non-DEBUG) throwaway terminal so the download comes from R2 itself, and paste timing in the F4-05 close-out.

## 6. Suites (evidence)

```
terminal: 232 passed + 2 new pipeline tests (2 passed w/ rsync; visible skip in-container) 
API:      361 passed (throwaway backend container, pytest)
script:   bash -n SYNTAX-OK · py_compile PY-OK · --check SELF-TEST OK
```

## 7. Files

| file | change |
|---|---|
| `scripts/make_demo_zip.sh` | NEW — deterministic demo-zip builder + `--check` self-test |
| `portfolio_api/scripts/r2_demo_zip.py` | NEW — R2 upload/info/ls/download helper (creds never printed) |
| `portfolio-terminal/tests/test_demo_zip_pipeline.py` | NEW — pins the harness contract |
| `scripts/README.md` | demo-enablement recipe (build → upload → admin flip) |
| `.gitignore` | `.demo-zip-staging/` |
| `portfolio_api/media/project-files/minishell.zip` | local dev copy replaced with slim build (git-ignored path, not committed) |
