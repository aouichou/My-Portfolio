#!/usr/bin/env bash
#
# G3 rehearsal — the local dump-restore loop (ADR 0001 guardrail G3, task P0-8 / F1-01).
#
# Restores the frozen pre-rework production dump into the local postgres from
# docker-compose.dev.yml, then asserts the row counts and migration state that
# every schema/ETL change must preserve. Run this before and after any rework
# change that touches the data model; two consecutive green runs = rehearsed.
#
# Usage:  bash scripts/rehearse_dump_restore.sh
# Exit:   0  all assertions passed  -> final line "G3 REHEARSAL: GREEN"
#         1  assertion or configuration failure (RED)
#         2  environment not ready (docker daemon down / db container unusable)
#
# The expected counts below are baked from backups/neon-pre-rework-20261002.dump
# itself (COPY-block parse, cross-checked python + awk, 2026-10-05) — NOT from
# the audit reports. The dump is frozen; if these assertions fail after a code
# change, the change broke the restore path. That is the point of the script.

set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

COMPOSE_FILE="docker-compose.dev.yml"
DB_CONTAINER="portfolio-db-dev"   # container_name of the db service
DB_USER="postgres"                # POSTGRES_USER in docker-compose.dev.yml
TARGET_DB="portfolio_dev"         # POSTGRES_DB in docker-compose.dev.yml
DUMP="$REPO_ROOT/backups/neon-pre-rework-20261002.dump"  # profile rule 4 restore point

# Expected row counts — from neon-pre-rework-20261002.dump (dumped 2026-10-02).
# Note: the master plan said 11 projects / 14 contact submissions; the dump
# holds 12 / 15. The dump is the frozen source of truth, so 12 it is.
EXPECTED_PROJECT=12
EXPECTED_GALLERY=15
EXPECTED_GALLERYIMAGE=56
EXPECTED_INTERNSHIP=1
EXPECTED_INTERNSHIPPROJECT=3     # matches the data audit
EXPECTED_MIGRATIONS_TOTAL=28     # full django_migrations ledger

# The ghost migration: applied in prod (hence in the dump), absent on disk.
# Its exact applied name — profile §2's "0008_alter_project_thumbnail" is
# shorthand. The OTHER applied 0008 (..._and_more, 17:00) IS on disk: not a
# ghost. F1-02 must reconcile exactly this row.
GHOST_MIGRATION="0008_alter_galleryimage_image_alter_project_thumbnail"
GHOST_FILE="$REPO_ROOT/portfolio_api/projects/migrations/${GHOST_MIGRATION}.py"

FAILURES=0
RESTORE_LOG="$(mktemp /tmp/g3-restore.XXXXXX.log)"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
step() { printf '\n==> %s\n' "$1"; }
pass() { printf '  [PASS] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
info() { printf '  [INFO] %s\n' "$1"; }

sql() {  # sql <database> <query> -> single value on stdout
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$1" -tAc "$2"
}

assert_count() {  # assert_count <table> <expected> <label>
  local table="$1" expected="$2" label="$3" actual
  actual="$(sql "$TARGET_DB" "SELECT count(*) FROM $table")"
  if [ "$actual" -eq "$expected" ]; then
    pass "$label: $table = $actual (expected $expected)"
  else
    fail "$label: $table = $actual (expected $expected)"
  fi
}

# ---------------------------------------------------------------------------
# 1. Environment: docker daemon, db container, postgres version
# ---------------------------------------------------------------------------
step "Checking docker daemon"
if ! command -v docker >/dev/null 2>&1; then
  echo "  [FAIL] docker CLI not found on PATH."
  exit 2
fi
if ! docker info >/dev/null 2>&1; then
  echo "  [FAIL] Docker daemon is not running."
  echo "  Fix  : run: sudo systemctl start docker"
  echo "  Then : re-run: bash scripts/rehearse_dump_restore.sh"
  exit 2
fi
pass "docker daemon is running"

step "Ensuring db container '$DB_CONTAINER' is up"
running="$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)"
if [ "$running" != "true" ]; then
  info "container not running — starting the db service from $COMPOSE_FILE"
  if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
  else
    echo "  [FAIL] neither 'docker compose' nor 'docker-compose' is available."
    echo "  Fix  : docker compose -f $COMPOSE_FILE up -d db"
    exit 2
  fi
  # shellcheck disable=SC2086  # COMPOSE intentionally word-splits
  (cd "$REPO_ROOT" && $COMPOSE -f "$COMPOSE_FILE" up -d db)
  # Bounded readiness wait (45 x 2s) — this script must never hang.
  ready=0
  for _ in $(seq 1 45); do
    if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 2
  done
  if [ "$ready" -ne 1 ]; then
    echo "  [FAIL] postgres did not become ready within 90s."
    echo "  Likely cause: the dev volume was initialised by postgres:14 and the"
    echo "  image is now 17-alpine (PG refuses the old data dir). Dev data is"
    echo "  disposable — discard the volume once and re-run:"
    echo "    docker compose -f $COMPOSE_FILE down -v"
    exit 2
  fi
fi
pass "db container is up"

step "Verifying local postgres is 17.x (dump is from Neon PG 17)"
server_version="$(sql postgres 'SHOW server_version')" || server_version=""
major="${server_version%%.*}"
if [ "$major" != "17" ]; then
  fail "local postgres is '${server_version:-unreachable}' — must be 17.x"
  echo "  Fix  : set the db service image in $COMPOSE_FILE to postgres:17-alpine,"
  echo "         then: docker compose -f $COMPOSE_FILE down -v && docker compose -f $COMPOSE_FILE up -d db"
  exit 1
fi
pass "postgres server_version = $server_version"

# ---------------------------------------------------------------------------
# 2. Restore: drop/recreate target DB, pg_restore the frozen dump
# ---------------------------------------------------------------------------
step "Locating dump"
if [ ! -f "$DUMP" ]; then
  fail "dump not found: $DUMP"
  echo "  It is the mandatory pre-rework restore point (profile rule 4),"
  echo "  git-ignored — never committed, never edited."
  exit 1
fi
pass "dump found: $DUMP"

step "Restoring (drop/recreate $TARGET_DB, then pg_restore)"
docker cp "$DUMP" "$DB_CONTAINER:/tmp/g3-rehearsal.dump" >/dev/null
trap 'docker exec "$DB_CONTAINER" rm -f /tmp/g3-rehearsal.dump >/dev/null 2>&1 || true' EXIT
# Idempotency: WITH (FORCE) drops existing client connections, so back-to-back
# runs and a running dev backend both survive the rehearsal. DROP and CREATE
# must be separate psql invocations: psql -c wraps multi-statement strings in
# one transaction, and DROP DATABASE cannot run inside a transaction block.
sql postgres "DROP DATABASE IF EXISTS $TARGET_DB WITH (FORCE)" >/dev/null
sql postgres "CREATE DATABASE $TARGET_DB TEMPLATE template0" >/dev/null
set +e
docker exec "$DB_CONTAINER" pg_restore \
  -U "$DB_USER" -d "$TARGET_DB" --no-owner --no-acl \
  /tmp/g3-rehearsal.dump >"$RESTORE_LOG" 2>&1
restore_rc=$?
set -e

# Error triage. The dump carries Neon-only objects: CREATE EXTENSION
# pg_session_jwt (and its COMMENT) cannot succeed on vanilla postgres, so
# errors mentioning pg_session_jwt are allowlisted. ANY other error means the
# restore is not trustworthy and the rehearsal must go RED.
allowlisted="$(grep '^pg_restore: error:' "$RESTORE_LOG" | grep 'pg_session_jwt' || true)"
other_errors="$(grep '^pg_restore: error:' "$RESTORE_LOG" | grep -v 'pg_session_jwt' || true)"
if [ -n "$other_errors" ]; then
  fail "pg_restore rc=$restore_rc — NON-allowlisted errors (log: $RESTORE_LOG):"
  printf '%s\n' "$other_errors" | sed 's/^/      /'
elif [ "$restore_rc" -eq 0 ]; then
  pass "pg_restore completed with zero errors"
else
  pass "pg_restore rc=$restore_rc — only allowlisted Neon-extension failures:"
  printf '%s\n' "$allowlisted" | sed 's/^/      /'
  info "full restore log: $RESTORE_LOG"
fi

# ---------------------------------------------------------------------------
# 3. Assertions — the reason this script exists
# ---------------------------------------------------------------------------
step "Row-count assertions (expected values derived from the dump)"
assert_count projects_project          "$EXPECTED_PROJECT"           "unified Project rows"
assert_count projects_gallery          "$EXPECTED_GALLERY"           "galleries"
assert_count projects_galleryimage     "$EXPECTED_GALLERYIMAGE"      "gallery images"
assert_count projects_internship       "$EXPECTED_INTERNSHIP"        "deprecated Internship rows (stale, F1 ETL source)"
assert_count projects_internshipproject "$EXPECTED_INTERNSHIPPROJECT" "deprecated InternshipProject rows (stale, F1 ETL source)"
assert_count django_migrations         "$EXPECTED_MIGRATIONS_TOTAL"  "migration ledger total (guards partial restores)"

step "Ghost-migration assertion (F1-02 reconciliation target)"
ghost_applied="$(sql "$TARGET_DB" \
  "SELECT count(*) FROM django_migrations WHERE app='projects' AND name='$GHOST_MIGRATION'")"
if [ "$ghost_applied" -eq 1 ]; then
  pass "django_migrations contains projects.$GHOST_MIGRATION"
else
  fail "projects.$GHOST_MIGRATION expected 1 row in django_migrations, got $ghost_applied"
fi
if [ -f "$GHOST_FILE" ]; then
  info "$GHOST_MIGRATION.py now EXISTS on disk — reconciliation (F1-02) has landed"
else
  info "$GHOST_MIGRATION.py absent on disk — confirmed ghost until F1-02 reconciles it"
fi

step "User + PII-pending counts"
auth_users="$(sql "$TARGET_DB" 'SELECT count(*) FROM auth_user')"
if [ "$auth_users" -ge 1 ]; then
  pass "auth_user = $auth_users (>= 1)"
else
  fail "auth_user = $auth_users (expected >= 1)"
fi
# Recorded, not asserted: the contact_submissions PII decision is pending (F1-04).
# The dump holds 15 rows — plan G6 said 14; dump wins.
contact="$(sql "$TARGET_DB" 'SELECT count(*) FROM projects_contactsubmission')"
info "projects_contactsubmission = $contact (recorded only — PII decision pending F1-04)"

# ---------------------------------------------------------------------------
# 4. Verdict
# ---------------------------------------------------------------------------
step "Verdict"
if [ "$FAILURES" -gt 0 ]; then
  echo "G3 REHEARSAL: RED ($FAILURES failure(s))"
  exit 1
fi
echo "G3 REHEARSAL: GREEN"
