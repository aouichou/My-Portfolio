# F1-07 — etl_v2: lossless stale-content rescue into schema v2

> **Agent**: Senior Dev · **Date**: 2026-10-05 · **Branch**: `rework/v2`
> **Task**: F1-07 · **Spec**: `docs/designs/2026-10-05-schema-v2-field-map.md` (Annex A §2 + §5) + master plan v2.2 (D3/D4 baked)
> **Definition of done**: fixture committed from real dump data · full dry-run/apply/verify/idempotency on the G3-restored DB · suite green · G3 end-to-end green

---

## 1. Source strategy — the committed fixture (task option b)

The deprecated tables (`projects_internship`, `projects_internshipproject`) and the v1 Project columns (`diagram_type`, `architecture_diagram`) are **gone from the live schema after 0012**, but the ETL must read their content forever. Annex A specifies per-field expressions but no alternate source — the fixture strategy (task option b) is the answer:

- **`scripts/extract_stale_fixture.sh`** (NEW, committed): restores the frozen dump (`backups/neon-pre-rework-20261002.dump`, sha256 `a211d4179fbe…`) into a throwaway DB, extracts every row as JSON, asserts the frozen counts (1/3/12) + slug-join integrity, and writes the fixture. Neon-extension restore errors allowlisted (same rule as the G3 script).
- **`portfolio_api/projects/fixtures/stale_internship_content.json`** (NEW, committed, 243,069 bytes): the ETL's ONLY source of stale content — deterministic and re-runnable forever, independent of migration state. Sections: `internship` (1 row), `internshipprojects` (3), `project_rows` (all 12 unified rows AT DUMP STATE — the sweep's input + the tests' reconstruction source), `demo_files_manifest` (`["project-files/minishell.zip"]` — the real local media listing, R2 proxy per Batman's terminal note), `_meta` provenance (dump name + sha256 + counts).

The ETL therefore behaves identically in the flip window (runs between 0011/0012) and in rehearsal (runs after 0012): the fixture, not the live schema, is the source.

## 2. Forensic corrections to Annex A's premises (dump > help_text > audit)

Type-sniffing the REAL dump data (map §5.2 "declarations lie") corrected five map beliefs — all handled explicitly:

| # | Map believed | Dump truth | ETL handling |
|---|---|---|---|
| 1 | IP `related_documentation` empty (all 3 rows) | holds `[{icon, title, category, description}]` with `'...'` **placeholder content** | shape rescued canonically (icon stripped), placeholder content flagged for admin (F1-10) — never silently dropped |
| 2 | IP `thumbnail` null/`''` (non-issue) | real media paths `internship/projects/Copilot_*.png`; **but** unified rows were re-uploaded post-migrator as `projects/Copilot_*.png` (files exist there; the IP prefix has no files) | thumbnail is **verify-only**: live re-upload wins (§5.8 no-clobber) — rescuing the stale path would have regressed a live admin fix |
| 3 | migrator's first-diagram-only loss "restore if lists longer" | all 3 IP `architecture_diagrams` lists hold exactly 1 item; **row 16's v1 `architecture_diagram` column is EMPTY while IP16 has a real DDD diagram** | the IP rescue genuinely restores row 16's diagram (the v1 column would have lost it) |
| 4 | unified `code_snippets` == IP copy | live 14 holds 2 objects **without `code` keys**; live 15/16 hold `[]` while IP 5/6 hold placeholder objects — post-migrator admin edits | verify-only + canonical normalization; missing `code` padded to `""` and flagged (content preserved, not destroyed) |
| 5 | — | dump school rows hold **NULL** `stats`/`badges`/`impact_metrics` | 0011's NOT NULL alters backfilled `[]` on apply (verified on the real restore); the sweep canonicalizes from there |

## 3. What was built

### `portfolio_api/projects/management/commands/etl_v2.py` (full implementation, replaces the F1-06 scaffold)
- **Pure coercion helpers** (unit-tested): `to_tech_list`, `to_label_value`, `to_impact_list` (long sentences → `description`), `to_badge_list` (color stripped), `to_demo_commands`, `to_code_steps` (int-key ordered, legacy `'0'`-wrapper unwrapped), `to_code_snippets` (the deleted serializer's inflation rules reused for dicts; array normalize for lists), `to_doc_list` (icon stripped), `to_diagrams_from_v1` (school columns → single-element array), `to_diagrams_from_ip` (map §2.1 expression verbatim — full list restored). Every helper branches on `isinstance` — never trusts declarations.
- **`SOURCE_FIELD_DISPOSITIONS`** — the zero-unmapped-fields ledger: every fixture source field (internship ×18, internshipprojects ×21, project_rows ×30) has a recorded disposition (`copy` / `verify` / `canon` / `transform` / `drop` with reason). `--verify` fails if any field is unmapped.
- **Modes**: `--dry-run` (default) prints per-project field diffs + counts + explicit notes, zero writes; `--apply` executes (Experience upsert on slug; per-field skip-if-equal; `created_at` provenance via raw UPDATE since `auto_now_add` can't be overridden); `--verify` runs 206 invariant checks and exits non-zero with the precise failure list.
- **Guards**: fixture counts + slug-join validation; live-vs-fixture slug mismatch halts (orphan detection, map §5.8 — never silently skip).
- **Decision values baked**: D3 `mistral-realms` → `personal`; D4 `Experience.role = "Fullstack Engineer intern"`; fabricated internship `score=100` → null; `challenges` pollution → null (both logged as notes, map §5.5).

### `portfolio_api/tests/test_etl_v2.py` — 49 tests
Coercion helpers (19) · fixture contract (5) · dry-run (3) · apply (8) · idempotency (2) · verify (5) · orphan guards (3) · verify-only semantics (3) · CLI exit codes (2, via `tests/etl_cli_settings.py` — a real migrated sqlite file DB per subprocess run). The `stale_env` fixture reconstructs the exact dump state from `project_rows` (NULLs → `[]` exactly as 0011 materialized them).

## 4. G3 discipline — evidence (all on real dump data)

### 4.1 Fresh restore → migrate → dry-run → apply → verify
```
G3 REHEARSAL: GREEN                       (12/15/56/1/3 rows, ledger 28, ghost OK)
  Applying projects.0010_ghost_reconciliation... OK
  Applying projects.0011_schema_v2... OK
  Applying projects.0012_drop_deprecated... OK
etl_v2 --dry-run → exit 0    (1 experience create + 84 project diffs across 12 rows, 16 notes)
etl_v2 --apply   → exit 0
  Experience 'qynapse-healthcare': created
  clinical-analytics-platform: 12 field(s) updated ... (all 12 rows touched)
  Apply summary: experience diffs applied: 1 · project diffs applied: 84 · projects touched: 12
etl_v2 --verify  → exit 0
  206 × [PASS], 0 × [FAIL] — "VERIFY PASSED — all invariants green."
  incl. "zero unmapped source fields (unmapped: none)"
```

### 4.2 Idempotency proof
```
second --apply → exit 0
  Experience 'qynapse-healthcare': no changes (idempotent)
  (no project changes — idempotent no-op)
  experience diffs applied: 0 · project diffs applied: 0 · projects touched: 0
--verify after → exit 0, VERIFY PASSED
```

### 4.3 Full suite
```
python -m pytest -q → 178 passed, 11 warnings (129 baseline + 49 new ETL tests)
```

### 4.4 G3 final re-run GREEN end-to-end
```
restore (G3 GREEN) → migrate (OK) → etl_v2 --apply (APPLY complete.) → --verify (VERIFY PASSED, exit 0)
makemigrations --check --dry-run → No changes detected (zero drift)
```

## 5. Per-project rescue summary (post-ETL real state)

**Experience** (1:1 from the stale Internship row): Qynapse · `Fullstack Engineer intern` (D4) · `qynapse-healthcare` · 2025-05-12 → 2025-11-11 · order 1 · active · stats canonical (5 entries) · 25 technologies · 6 impact metrics · 7 code samples · 12 documentation entries · 1 ZTA mermaid diagram ("Zero Trust Architecture") · `created_at` backfilled to 2025-11-20T16:52:14Z.

| slug | type | score | order | exp FK | rescued |
|---|---|---|---|---|---|
| philosophers…ft_transcendence (8 school) | school | preserved (95–125) | 0 | — | v1 `architecture_diagram`+`diagram_type` → canonical array; dict→canonical sweep (tech_stack/demo_commands/code_steps/code_snippets); dead `demo_files_path`s nulled (§5.4) |
| clinical-analytics-platform | internship | None (was 100) | 1 | ✓ | full IP diagram list (migrator kept [0]); `related_documentation` (placeholder content flagged); `created_at` provenance; `challenges` pollution nulled; FK linked |
| keycloak-integration-library | internship | None (was 100) | 2 | ✓ | same rescues; live `code_snippets=[]` kept (verify-only, admin edit) |
| patient-monitoring-module | internship | None (was 100) | 3 | ✓ | **diagram restored** — v1 column was empty, IP list had the real DDD diagram |
| mistral-realms | personal (D3) | 0 (kept) | 0 | — | retyped; canonical sweep |
| minishell | school | 101 | 0 | — | `demo_files_path` KEPT (`project-files/minishell.zip` — verified, Batman's terminal note) |

**Explicit notes (16)** — the never-silent ledger: 5 unverifiable demo paths nulled; 2 code_snippets padded (missing `code`); 3 thumbnail divergences (live wins); 2 code_snippets divergences (live wins); 3 fabricated scores nulled; 1 D3 retype.

## 6. Judgment calls & flags for Batman/next tasks

1. **Thumbnail disposition flip** (map said rescue, data says verify-only): the unified rows' re-uploaded `projects/Copilot_*.png` are the live truth; the IP paths point at nothing. Documented in the ledger + §2 above.
2. **`related_documentation` placeholder content** (`'...'` values): shape is rescued; Batman should replace the placeholder strings in admin (F1-10) — the ETL stores truth, it doesn't editorialize (map §6.1).
3. **`mistral-realms` score=0 kept**: D3 retypes only; the 0 score is stored truth (fixture F1-09 can revisit).
4. **`Apis Developed` label**: `humanize` is title-case per map §3.4 — acronyms lowercase. Cosmetic; F3 copy polish territory.
5. **Fixture regenerates deterministically**: `extract_stale_fixture.sh` re-runs green; `extracted_at`/manifest note included for flip-time refresh.

## 7. Files changed

| File | Change |
|---|---|
| `scripts/extract_stale_fixture.sh` | NEW — fixture generator from the frozen dump |
| `portfolio_api/projects/fixtures/stale_internship_content.json` | NEW — committed fixture (243 KB) |
| `portfolio_api/projects/management/commands/etl_v2.py` | scaffold → full implementation |
| `portfolio_api/tests/test_etl_v2.py` | NEW — 49 tests |
| `portfolio_api/tests/etl_cli_settings.py` | NEW — subprocess CLI test settings (file-backed sqlite) |

## 8. Commands run (abridged, all pasted above)

```
bash scripts/extract_stale_fixture.sh                    # EXTRACT FIXTURE: GREEN
bash scripts/rehearse_dump_restore.sh                    # G3 GREEN (×3 this session)
manage.py migrate                                        # 0010/0011/0012 OK
manage.py etl_v2 --dry-run / --apply / --verify          # exit 0 / 0 / 0 (206 PASS)
manage.py etl_v2 --apply (second)                        # 0 changes — idempotent
python -m pytest -q                                      # 178 passed
manage.py makemigrations --check --dry-run               # No changes detected
```

## 9. Commit

```
feat(etl): lossless stale-content rescue into schema v2 (F1-07)
```
`--no-gpg-sign`, on `rework/v2`, not pushed.
