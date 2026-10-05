# Fixture archive — pre-unification seeds (NEVER LOAD THESE)

**Archived**: 2026-10-05 (F1-09) · **Superseded by**: `portfolio_api/projects/fixtures/seed_v2.json` + `etl_v2`

| File | Was | What it held |
|---|---|---|
| `projects-v1.json` | `portfolio_api/projects.json` | 6 pre-unification school-project seeds in the v1 import format (dict-shaped `demo_commands`/`code_steps`/`code_snippets`, `has_interactive_demo`, `diagram_type` + single `architecture_diagram`, embedded `galleries`) — consumed by the deleted `import_projects` command |
| `internship-data-v1.json` | `portfolio_api/projects/fixtures/internship_data.json` | The deprecated `projects.Internship` / `projects.InternshipProject` rows (models deleted in F1-06, tables dropped in `0012_drop_deprecated`) — loading it now fails on missing models |

## Why never again

1. **The models are gone.** `internship-data-v1.json` targets `projects.internship` /
   `projects.internshipproject` — tables dropped by migration `0012`. `loaddata` errors
   on unknown models; `projects-v1.json`'s consumer (`import_projects`) no longer
   exists, and its field shapes predate the canonical JSON policy (field map §3.4).
2. **Real content lives elsewhere.** The production content was rescued losslessly by
   `manage.py etl_v2` (F1-07) from the frozen dump; its permanent source is
   `fixtures/stale_internship_content.json` (also never a `loaddata` target — it is
   the ETL's input document, with a `_meta` section and per-section shapes that are
   not Django fixtures at all).
3. **Fresh installs use `seed_v2.json`** — schema-v2 shapes, scrubbed for a
   media-free clean DB (see its header comment).

These files are retained **only** as historical reference for the pre-rework seed
strategy. Do not `loaddata` them, do not point tooling at them, do not "fix" them —
the canonical v2 seed is regenerated from the live post-ETL state when needed
(F1-09 report documents the derivation).
