#!/usr/bin/env bash
#
# Generate portfolio_api/projects/fixtures/seed_v2.json (F1-09) from the
# post-ETL state of the local rehearsal DB (docker-compose.dev.yml postgres).
#
# The seed is the MINIMAL fresh-install dataset: every unified Project row +
# the single Experience row, scrubbed so it loads on a clean database that has
# NO media files (thumbnails null, demo_files_path null, galleries omitted).
# Full-content rehearsals use the G3 dump-restore loop instead — the seed
# exists so a fresh dev install shows real content, not so it replicates prod.
#
# Usage:   bash scripts/generate_seed_v2.sh
# Exit:    0  fixture regenerated + self-checked (counts, scrub invariants)
#          1  any invariant failed — the fixture on disk is then NOT trusted
#
# Preconditions:
#   - the rehearsal DB (portfolio_dev) has been migrated + etl_v2 --apply'ed
#     (the G3 loop in full form). Row counts are asserted before dumping.
#
# Scrub rules (documented in the generator header + F1-09 report):
#   1. thumbnail / thumbnail_url      -> null (media absent on fresh installs)
#   2. demo_files_path               -> null (only minishell.zip exists in R2;
#                                         Phase 4 re-populates via admin upload)
#   3. is_featured                   -> forced False (thumbnail required IFF
#                                         featured — model clean() would reject
#                                         featured rows with no thumbnail)
#   4. created_at / updated_at       -> KEPT (real provenance). loaddata saves
#                                         with raw=True which bypasses
#                                         auto_now_add/auto_now pre_save, so
#                                         omitting them violates NOT NULL.
#   5. galleries                     -> not dumped (omitted by scope choice)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_CONTAINER="portfolio-db-dev"
DB_USER="postgres"
TARGET_DB="portfolio_dev"
OUT="$REPO_ROOT/portfolio_api/projects/fixtures/seed_v2.json"

EXPECTED_PROJECT=12
EXPECTED_EXPERIENCE=1

FAILURES=0
step() { printf '\n==> %s\n' "$1"; }
pass() { printf '  [PASS] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1"; FAILURES=$((FAILURES + 1)); }

sql() {  # sql <query> -> single value on stdout
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$TARGET_DB" -tAc "$2"
}

step "Asserting source state (post-ETL rehearsal DB)"
proj_count="$(sql x 'SELECT count(*) FROM projects_project')"
exp_count="$(sql x 'SELECT count(*) FROM projects_experience')"
[ "$proj_count" -eq "$EXPECTED_PROJECT" ] \
  && pass "projects_project = $proj_count" || fail "projects_project = $proj_count (expected $EXPECTED_PROJECT)"
[ "$exp_count" -eq "$EXPECTED_EXPERIENCE" ] \
  && pass "projects_experience = $exp_count" || fail "projects_experience = $exp_count (expected $EXPECTED_EXPERIENCE)"
if [ "$FAILURES" -gt 0 ]; then
  echo "Source DB is not in the expected post-ETL state — run the G3 loop first:"
  echo "  bash scripts/rehearse_dump_restore.sh && (migrate + etl_v2 --apply)"
  exit 1
fi

step "Dumping + scrubbing -> $OUT"
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/$TARGET_DB"
export DJANGO_SETTINGS_MODULE=portfolio_api.settings
export PYTHONDONTWRITEBYTECODE=1
cd "$REPO_ROOT/portfolio_api"
.venv/bin/python - "$OUT" <<'PYEOF'
import json
import sys
from io import StringIO

import django  # noqa: E402  (settings via env, imported after path setup)

django.setup()
from django.core.management import call_command

buf = StringIO()
call_command("dumpdata", "projects.Project", "projects.Experience",
             indent=2, stdout=buf)
data = json.loads(buf.getvalue())

out = []
for row in data:
    fields = row["fields"]
    if row["model"] == "projects.project":
        fields["thumbnail"] = None
        fields["thumbnail_url"] = None
        fields["demo_files_path"] = None
        fields["is_featured"] = False
    out.append(row)

out.sort(key=lambda r: (r["model"], r["pk"]))

with open(sys.argv[1], "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
    f.write("\n")

n_proj = sum(1 for r in out if r["model"] == "projects.project")
n_exp = sum(1 for r in out if r["model"] == "projects.experience")
print(f"  wrote {n_proj} projects + {n_exp} experiences")
PYEOF
pass "fixture written"

step "Self-checking the fixture"
.venv/bin/python - "$OUT" <<'PYEOF'
import json
import sys

with open(sys.argv[1]) as f:
    data = json.load(f)
projs = [r for r in data if r["model"] == "projects.project"]
exps = [r for r in data if r["model"] == "projects.experience"]
ok = True

def check(cond, label):
    global ok
    print(f"  [{'PASS' if cond else 'FAIL'}] {label}")
    ok = ok and cond

check(len(projs) == 12, f"12 projects (got {len(projs)})")
check(len(exps) == 1, f"1 experience (got {len(exps)})")
types = {}
for p in projs:
    types[p["fields"]["project_type"]] = types.get(p["fields"]["project_type"], 0) + 1
check(types == {"school": 8, "internship": 3, "personal": 1},
      f"type mix 8 school / 3 internship / 1 personal (got {types})")
check(all(p["fields"]["thumbnail"] is None for p in projs), "thumbnails null")
check(all(p["fields"]["thumbnail_url"] is None for p in projs), "thumbnail_url null")
check(all(p["fields"]["demo_files_path"] is None for p in projs), "demo_files_path null")
check(all(p["fields"]["is_featured"] is False for p in projs), "is_featured False")
check(all("created_at" in p["fields"] for p in projs), "project timestamps present")
check(all("created_at" in e["fields"] for e in exps), "experience timestamps present")
check(all(p["fields"].get("experience") in (None, 1) for p in projs),
      "experience FK null or pk 1")
check(all(p["fields"]["slug"] for p in projs), "all slugs present")
check(len({p["fields"]["slug"] for p in projs}) == 12, "slugs unique")

sys.exit(0 if ok else 1)
PYEOF

step "Verdict"
if [ "$FAILURES" -gt 0 ]; then
  echo "SEED V2 GENERATION: RED"
  exit 1
fi
echo "SEED V2 GENERATION: GREEN"
