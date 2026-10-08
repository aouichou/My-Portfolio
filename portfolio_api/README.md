# portfolio_api — Django backend (schema v2 / contract v2)

Django 6 + DRF + Channels backend serving the frozen **API contract v2**
and the terminal WebSocket proxy. Part of the portfolio rework on branch
`rework/v2` (freeze-flip strategy — see `docs/designs/2026-10-05-api-contract-v2.md`).

## API surface (contract v2 — FROZEN 2026-10-05)

9 HTTP routes + 2 WebSocket routes. The authoritative, frozen specification —
endpoint table, exact JSON shapes, error conventions, pagination, filter
semantics — lives at **`docs/designs/2026-10-05-api-contract-v2.md`**. The
machine check for that contract is the test suite
(`tests/test_api_contract_v2.py` asserts the §3 shapes with exact key sets).

| Route | Purpose |
|---|---|
| `GET /healthz` | infra health (Render health-check path) |
| `GET /api/` | static meta root |
| `GET /api/projects/` | unified list — paginated (limit/offset, default 24/max 100), `project_type` + `has_demo` filters (invalid values → 400) |
| `GET /api/projects/{slug}/` | full detail incl. galleries + demo block |
| `GET /api/projects/{slug}/files/` | R2 demo-zip URL |
| `GET /api/experiences/` · `/{slug}/` | light list / hero detail with nested project cards |
| `POST /api/contact/` | anonymous write, 5/min/IP, fire-and-forget SMTP (never 500s on SMTP failure) |
| `GET /api/auth/terminal-token/?slug=` | guest JWT mint (HS256, 5-min, purpose-scoped, **slug-bound** — F4-02: requires an existing `has_demo=true` slug; 400 unknown/missing, 403 not-enabled), 30/min/IP |
| `WS /ws/terminal/{slug}/` · `/ws/health/` | terminal proxy + liveness (wire frozen; Phase 4 owns changes) |

The deprecated `/api/internships*` routes were deleted (F1-06/F2-03);
`/api/health/` was deleted (duplicates `/healthz`).

## Running the tests

```bash
cd portfolio_api
pytest                       # full suite — sqlite in-memory, locmem email/cache,
                             # no Redis/S3/SMTP needed (see tests/test_settings.py)
```

CI runs the same command (`.github/workflows/test-api.yml`, working
directory `portfolio_api`).

## The G3 rehearsal loop

Any change touching the data model (models, migrations, ETL) must be proven
against the frozen pre-rework production dump before AND after:

```bash
bash scripts/rehearse_dump_restore.sh    # from the repo root
# restores backups/neon-pre-rework-20261002.dump into the docker-compose.dev.yml
# postgres, then asserts row counts + migration state.
# Final line must read: G3 REHEARSAL: GREEN
```

The dev stack (`docker compose -f docker-compose.dev.yml up -d`, repo root)
bind-mounts this directory — runserver auto-reloads on code changes.

## Data-model provenance

- `projects/migrations/` — schema v2 chain (`0010` ghost reconciliation →
  `0011_schema_v2` → `0012_drop_deprecated` → `0013` admin metadata).
- `projects/management/commands/etl_v2.py` — idempotent rescue of the
  deprecated internship rich content (`--dry-run` default, `--apply`,
  `--verify`).
- `projects/fixtures/seed_v2.json` — fresh-install seed (12 projects,
  8 school / 3 internship / 1 personal + 1 Experience); v1 seeds are archived
  under `projects/fixtures/archive/` and never re-imported.
