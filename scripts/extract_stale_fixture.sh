#!/usr/bin/env bash
#
# F1-07 — Extract the stale-content fixture from the frozen pre-rework dump.
#
# Source strategy (F1-07 task brief): option (b) — the deprecated tables
# (projects_internship, projects_internshipproject) and the v1 Project columns
# (diagram_type, architecture_diagram) are GONE from the live schema after
# 0012, but the ETL must read their content forever. This script restores the
# frozen dump (backups/neon-pre-rework-20261002.dump — profile rule 4 restore
# point) into a THROWAWAY database, extracts every row as JSON, and writes the
# committed fixture portfolio_api/projects/fixtures/stale_internship_content.json.
#
# The fixture is the ETL's ONLY source of stale content: deterministic and
# re-runnable forever, independent of any migration state.
#
# Sections emitted:
#   internship        — the single deprecated Internship row (Experience source)
#   internshipprojects— the 3 deprecated InternshipProject rows (rescue source)
#   project_rows      — all 12 unified Project rows AT DUMP STATE (v1 value
#                       shapes: flat tech_stack, dict demo_commands/code_steps/
#                       code_snippets/stats/badges/impact_metrics, v1 columns
#                       diagram_type/architecture_diagram) — the pre-ETL live
#                       state the sweep canonicalizes, and the exact state the
#                       F1-07 tests reconstruct.
#   demo_files_manifest— media keys verified to exist locally (R2 proxy per
#                       Batman's terminal note: only minishell.zip is real).
#                       Annex A §5.4: ETL nulls unverifiable demo paths.
#   provenance        — dump path, sha256, row counts, extract timestamp.
#
# Usage:  bash scripts/extract_stale_fixture.sh
# Exit:   0 fixture written (or already identical — idempotent)
#         1 extraction/assertion failure
#         2 environment not ready

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_CONTAINER="portfolio-db-dev"
DB_USER="postgres"
DUMP="$REPO_ROOT/backups/neon-pre-rework-20261002.dump"
EXTRACT_DB="portfolio_fixture_extract"
FIXTURE="$REPO_ROOT/portfolio_api/projects/fixtures/stale_internship_content.json"
MEDIA_PROJECT_FILES="$REPO_ROOT/portfolio_api/media/project-files"

step() { printf '\n==> %s\n' "$1"; }
pass() { printf '  [PASS] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1"; }

command -v docker >/dev/null 2>&1 || { fail "docker CLI not found"; exit 2; }
docker info >/dev/null 2>&1 || { fail "docker daemon not running"; exit 2; }
[ -f "$DUMP" ] || { fail "dump not found: $DUMP"; exit 1; }

step "Restoring dump into throwaway db '$EXTRACT_DB'"
docker cp "$DUMP" "$DB_CONTAINER:/tmp/fixture-extract.dump" >/dev/null
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -qtc \
  "DROP DATABASE IF EXISTS $EXTRACT_DB WITH (FORCE)" >/dev/null
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -qtc \
  "CREATE DATABASE $EXTRACT_DB TEMPLATE template0" >/dev/null
RESTORE_LOG="$(mktemp /tmp/fixture-restore.XXXXXX.log)"
docker exec "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$EXTRACT_DB" \
  --no-owner --no-acl /tmp/fixture-extract.dump >"$RESTORE_LOG" 2>&1 || true
# Neon-only extension failures are allowlisted (same rule as the G3 script).
OTHER_ERRORS="$(grep '^pg_restore: error:' "$RESTORE_LOG" | grep -v 'pg_session_jwt' || true)"
[ -z "$OTHER_ERRORS" ] || { fail "non-allowlisted restore errors:"; printf '%s\n' "$OTHER_ERRORS"; exit 1; }
pass "restore complete (allowlisted Neon-extension errors only)"

step "Extracting rows as JSON"
TMPDIR_EXTRACT="$(mktemp -d /tmp/fixture-extract.XXXXXX)"
trap 'rm -rf "$TMPDIR_EXTRACT"' EXIT
extract() {  # extract <table> -> JSON array (ordered by id) into $TMPDIR_EXTRACT/<table>.json
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$EXTRACT_DB" -tAc \
    "SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY id), '[]'::jsonb) FROM (SELECT * FROM $1) t" \
    >"$TMPDIR_EXTRACT/$1.json"
}
extract projects_internship
extract projects_internshipproject
extract projects_project
pass "extracted internship / internshipproject / project rows"

step "Writing fixture $FIXTURE"
DUMP_SHA256="$(sha256sum "$DUMP" | cut -d' ' -f1)"
python3 - "$FIXTURE" "$TMPDIR_EXTRACT" "$MEDIA_PROJECT_FILES" "$DUMP_SHA256" \
  "$(basename "$DUMP")" <<'PY'
import json, os, sys
from datetime import datetime, timezone

fixture_path, extract_dir, media_root, dump_sha, dump_name = sys.argv[1:6]

def load(name):
    with open(os.path.join(extract_dir, f'{name}.json'), encoding='utf-8') as fh:
        return json.load(fh)

internship = load('projects_internship')
ip = load('projects_internshipproject')
projects = load('projects_project')

manifest = []
if os.path.isdir(media_root):
    manifest = [
        os.path.join('project-files', name)
        for name in sorted(os.listdir(media_root))
        if os.path.isfile(os.path.join(media_root, name))
    ]

# Sanity: the frozen dump's exact counts (G3-baked). Anything else halts.
assert len(internship) == 1, f"expected 1 Internship row, got {len(internship)}"
assert len(ip) == 3, f"expected 3 InternshipProject rows, got {len(ip)}"
assert len(projects) == 12, f"expected 12 Project rows, got {len(projects)}"
# Slug join integrity: every IP slug must match a unified Project slug.
unified_slugs = {p['slug'] for p in projects}
for row in ip:
    assert row['slug'] in unified_slugs, f"orphan InternshipProject slug {row['slug']!r}"

fixture = {
    '_meta': {
        'description': (
            'Frozen stale-content source for the F1-07 etl_v2 command '
            '(schema v2 rescue). Extracted from the pre-rework prod dump '
            'BEFORE migrations 0011/0012 removed the deprecated tables and '
            'v1 columns. Never edit by hand — regenerate via '
            'scripts/extract_stale_fixture.sh.'
        ),
        'source_dump': dump_name,
        'source_dump_sha256': dump_sha,
        'extracted_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'row_counts': {
            'internship': len(internship),
            'internshipproject': len(ip),
            'project': len(projects),
        },
        'demo_files_note': (
            'demo_files_manifest lists media keys verified to exist locally '
            '(R2 proxy; Batman terminal note 2026-10-03: only minishell.zip '
            'is real). etl_v2 nulls any demo_files_path not in this list '
            '(Annex A §5.4). Regenerate alongside the fixture for a fresh '
            'R2 listing at flip time.'
        ),
    },
    'demo_files_manifest': manifest,
    'internship': internship,
    'internshipprojects': ip,
    'project_rows': projects,
}

with open(fixture_path, 'w', encoding='utf-8') as fh:
    json.dump(fixture, fh, indent=2, ensure_ascii=False)
    fh.write('\n')
print(f"  wrote {fixture_path} ({os.path.getsize(fixture_path)} bytes)")
PY
pass "fixture written"

step "Cleanup"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -qtc \
  "DROP DATABASE IF EXISTS $EXTRACT_DB WITH (FORCE)" >/dev/null
docker exec "$DB_CONTAINER" rm -f /tmp/fixture-extract.dump >/dev/null
pass "throwaway db dropped"

printf '\nEXTRACT FIXTURE: GREEN\n'
