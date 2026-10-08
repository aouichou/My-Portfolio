# F4-03 — Session hardening: kernel rlimits, private scratch, guaranteed post-session cleanup

**Task** (Senior Dev dispatch, 2026-10-08): shared-container hardening per decision **D8 = A+ executed** — kernel rlimits per session, per-session scratch dirs, and **guaranteed post-session cleanup** (Batman's explicit ask: anything a visitor creates is erased when they leave).
**Branch**: `rework/v2` (base `b6d77cb`) · **Commit**: `feat(terminal): session hardening — kernel rlimits, private scratch, guaranteed post-session cleanup (F4-03)`
**Suites**: terminal **232/232** (207 + 25 new) · API 361/361 · UI v2 262/262 · old UI 13/13 — all green.
**Docker-per-session → Backlog** (hosting-dependent; note appended to the master plan's F4-04/D8 section).

## What was built (all in `portfolio-terminal/main.py`)

### 1. Kernel rlimits per session tree
- `session_rlimits()` + `apply_session_rlimits()`: applied via pexpect **`preexec_fn`** — runs in the forked child between fork and exec, so limits bind the whole session tree and cannot be shed by anything typed into the shell (kernel layer, independent of the command validator a compiled demo binary never goes through).
- Env-tunable via `TERMINAL_RLIMIT_CPU` (120s CPU), `TERMINAL_RLIMIT_AS` (512MiB), `TERMINAL_RLIMIT_FSIZE` (20MiB), `TERMINAL_RLIMIT_NPROC`, plus unconditional `RLIMIT_CORE=0`.
- ptyprocess propagates a `preexec_fn` exception to the parent (issue-#119 exec-error pipe — probe-verified: `ZeroDivisionError` raised at spawn) → a failed `setrlimit` fails the spawn **loudly**, never an unprotected session.

**⚠️ Two live-smoke engineering findings (both folded into the design):**
1. **RLIMIT_NPROC is accounted per real-UID across the whole HOST kernel** — not per container. On the dev stack (Docker Desktop WSL VM, shared uid 1000 across WSL+VS Code+sibling containers), a fork-count probe confirmed uid 1000 already exceeds any useful finite value: live sessions hit `bash: fork: retry` on plain `touch`/`ls` at NPROC=64 **and** 256 (the probe even starved my host shell's prompt). → **NPROC default is 0 (off)**; env knob retained for dedicated-uid hosts (the D9 DO-droplet target — there it's a real fork-bomb brake). Fork-bomb defense otherwise: `TERMINAL_MAX_SESSIONS=10` + CPU 120s + AS 512M + validator, with cgroup `pids.max` as the F4-07 platform option.
2. **setrlimit can never RAISE past the inherited hard limit** (WSL pins a finite NPROC hard cap: `ulimit -Hu` = 39727). A dimension set to "unlimited" would raise → `ValueError: not allowed to raise maximum limit` → spawn dies. → a 0-valued dimension is **omitted entirely**, never set to RLIM_INFINITY.

### 2. Per-session private scratch dir
- `create_session_scratch(session_id)` → `/tmp/terminal-sessions/session-<uuid>/` (0700), bound as the bash child's **HOME and TMPDIR** via `build_child_env(home=…, tmpdir=…)` (allowlist intact — no secrets, LANG-only inheritance preserved).
- Visitor creations in `~/` or `/tmp` land in the private dir; bash history dies with the dir (the plan's `HISTFILE=/dev/null` goal, achieved structurally).
- Project files stay shared read-mostly: visitors CAN still write into the shared project dir (cwd) — **residual, accepted**: the post-session sweep erases it; a full copy-on-write overlay was scoped out as overkill (F4-05 small-zip re-download is the revisit knob for content edits).

### 3. Guaranteed post-session cleanup (Batman's ask)
- **Manifest baseline**: `snapshot_project_dir()` writes `<project_dir>/.session_manifest` (sorted root-relative paths) after fresh download (force) or on first session into a legacy dir (self-heal). NEVER refreshed per session — refreshing would bless the previous visitor's leftovers. Atomic via tmp+`os.replace`.
- **Sweep**: `restore_project_dir()` deletes every file/dir NOT in the manifest (root-level `.session_manifest` + `.cached_download` always preserved). Fail-safe: no manifest → skip; corrupt manifest → **never wipe** (no deletion without a provable baseline). Runs in the session `finally` (every exit path: disconnect, idle/lifetime timeout, error, cancel), off-loop via `asyncio.to_thread`.
- **Scratch removal**: `remove_session_scratch()` in the same finally (best-effort by design — never raises into finally).
- **Boot sweep**: `sweep_orphaned_projects()` at lifespan startup (before serving traffic) restores all project dirs + deletes all scratch dirs — backstops crashes/restarts. Live-proven: dropped `ORPHAN_BOOT_TEST.txt` between restarts → boot log `Boot sweep: removed 1 orphaned entries and 0 scratch dirs (crash recovery)` → file gone.

### 4. Hermetic test suite
- `tests/conftest.py` pins `TERMINAL_PROJECTS_DIR`/`TERMINAL_SESSION_SCRATCH_ROOT` under a temp dir **before** `import main` — the suite (incl. lifespan boot sweeps inside TestClient contexts) can never touch real paths.

## Tests (25 new — `tests/unit/test_session_hardening.py`)

- **Rlimits**: defaults sane (NPROC omitted); env tuning honored (`banana`/negative → default); zero-means-omitted; **live `/proc/<pid>/limits` read-back of a real bash child** (CPU 120 / AS 536870912 / FSIZE 20971520 / core 0); **live FSIZE adversarial** (30MiB write stops at exactly 20MiB + `File too large`); **live NPROC behavioral** (limit=1 blocks any fork — EAGAIN); preexec-failure fails spawn loudly; endpoint wires `preexec_fn=apply_session_rlimits`.
- **Scratch**: per-session dir + HOME/TMPDIR env binding; 0700 mode; removal incl. nested; missing-dir OK; failure swallowed+logged (never raises into finally).
- **Manifest/cleanup**: sorted entries excluding preserved names; **no per-session refresh** (leftovers never blessed); legacy self-heal; visitor files+dirs+nested swept (4 removals); manifest+cache marker survive; no-manifest no-op; **corrupt manifest never wipes**; content edits not reverted (documented residual); empty-baseline sweep keeps only preserved.
- **Boot sweep**: orphans restored + stale scratch removed; clean no-op.
- **Endpoint wiring** (stubbed spawn, real FS): full lifecycle — snapshot → scratch → env → disconnect → scratch gone → sweep removes a post-session drop, manifest survives.
- **Updated legacy tests**: `test_spawn_env_is_the_allowlist` (new per-session HOME/TMPDIR contract), `test_spawn_call_uses_allowlist_env` (source check now `build_child_env(`).

## Live smoke on the dev stack (evidence pasted in session log)

1. mint `?slug=minishell` → 200.
2. Connect direct :8001 → boot Welcome.
3. `pwd` → `/home/coder/projects/minishell`; `touch SMOKE_F.txt` in cwd → allowed.
4. `cd` → prompt `~`; `touch SMOKE_G.txt` in HOME; `pwd` → `/tmp/terminal-sessions/session-fba8c786-…`; `ls` shows `SMOKE_G`.
5. **Live `/proc` of the session's bash** (docker exec, session held open): `Max cpu time 120 120` · `Max file size 20971520 20971520` · `Max core file size 0 0`.
6. Disconnect → +4s: scratch dirs **0**, SMOKE files in project dir **0**, `.session_manifest` + `minishell-main` intact.
7. Restart-loop orphan test: file dropped between restarts → swept on boot (log line above).

## Ops / env (documented in both compose files)

Defaults in code; all optional env knobs: `TERMINAL_RLIMIT_CPU/AS/NPROC/FSIZE` (0 disables that dimension), `TERMINAL_SESSION_SCRATCH_ROOT`, `TERMINAL_PROJECTS_DIR`. No deploy action needed (Render env untouched — defaults apply).

## Decision record (surgical note appended to master plan F4-04/D8)

A+ executed · Docker-per-session → **Backlog** (hosting-dependent, revisit with D9 platform decision). Residuals documented: shared project dir writable (swept on disconnect; concurrent same-project sessions can sweep each other's drops); manifest path-based (content edits not reverted — F4-05 knob).

## Residual-risk note (for threat-model F4-01 doc)

- Shared project dir write access remains (by design, A+ scope) — mitigated by the guaranteed sweep on every exit path + boot backstop.
- RLIMIT_NPROC off by default on shared-uid hosts (host-kernel-wide accounting) — enable on the D9 dedicated host; cgroup `pids.max` at F4-07 covers it platform-side.
- Sweep is path-based: a visitor may EDIT manifested files during their session (reverted only by re-download; F4-05 revisit).

## Files touched (7)

`portfolio-terminal/main.py` (+327), `tests/unit/test_session_hardening.py` (new, 25 tests), `tests/conftest.py` (hermetic roots), `tests/integration/test_websocket_hardening.py` (env-contract update), `tests/unit/test_security_hotfixes.py` (source-check update), `docker-compose.dev.yml` + `docker-compose.yml` (env docs). Master-plan D8 note appended.
