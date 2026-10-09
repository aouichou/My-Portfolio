#!/usr/bin/env bash
#
# make_demo_zip.sh — reproducible demo-zip builder (F4-05a)
#
# Builds the zip the terminal service serves per project from a project
# SOURCE directory, applying the standard demo exclusions and a
# deterministic entry order (sorted, fixed timestamps) so two builds of
# the same tree are byte-identical.
#
# The terminal service downloads `project-files/<slug>.zip` from R2
# (portfolio-terminal/main.py: download_project_files) and extracts it
# into the session's project dir. The demo_commands stored on the
# Project row run relative to that dir, so the zip's TOP-LEVEL LAYOUT IS
# LOAD-BEARING: build from the source root that matches the commands
# (e.g. minishell's `./minishell` expects the binary built at the root).
#
# Exclusions (files that never belong in a served demo zip):
#   VCS        .git, .gitignore, .gitattributes, .github
#   Python     .venv, venv, __pycache__, *.pyc, .pytest_cache, .mypy_cache
#   Node       node_modules, .next, dist, build, .turbo, coverage
#   C builds   *.o, *.a, *.so, *.out, *.dSYM
#   Artifacts  media/ GIFs & screenshots (the SITE serves those from the
#              gallery — a demo zip that ships them re-downloads
#              megabytes the demo commands never touch)
#   Hidden     .DS_Store, .env*, and other dotfile junk
#
# Usage:
#   scripts/make_demo_zip.sh <src_dir> <slug> [--extra-exclude GLOB]...
#
#   <src_dir>   canonical project source directory (contents become the
#               zip root — pass the dir whose layout matches demo_commands)
#   <slug>      project slug; artifact is named <slug>.zip
#
# Output:
#   .demo-zip-staging/<slug>.zip  (repo root; git-ignored, never committed)
#
# The script NEVER uploads — uploading is a separate explicit step
# (portfolio_api/scripts/r2_demo_zip.py) so nothing reaches R2 without a
# deliberate command.
#
# Exit codes:
#   0 success   1 usage/environment   2 staging failed   3 zip failed
#   4 verification failed
#
# Self-test: scripts/make_demo_zip.sh --check
#   Builds a synthetic tree (junk + real files), asserts the junk is
#   excluded and the result deterministic (two runs, same sha256).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGING_ROOT="${STAGING_ROOT:-$REPO_ROOT/.demo-zip-staging}"

# Exclusion patterns (rsync --exclude syntax; matched against paths
# relative to src_dir). ONE list, pinned by the self-test.
EXCLUDES=(
  # VCS + repo plumbing
  '.git'
  '.github'
  '.gitignore'
  '.gitattributes'
  # Python
  '.venv'
  'venv'
  '__pycache__'
  '*.pyc'
  '.pytest_cache'
  '.mypy_cache'
  # Node
  'node_modules'
  '.next'
  'dist'
  'build'
  '.turbo'
  'coverage'
  # C build products
  '*.o'
  '*.a'
  '*.so'
  '*.out'
  '*.dSYM'
  # Demo-media bloat (served by the site gallery, not the terminal demo)
  'media/*.gif'
  'media/*.png'
  'media/*.jpg'
  'media/*.webp'
  'media/*.mp4'
  # Hidden junk + secrets
  '.DS_Store'
  '.env'
  '.env.*'
)

usage() { sed -n '2,45p' "${BASH_SOURCE[0]}"; }

fail() { echo "ERROR: $*" >&2; exit "${2:-1}"; }

# build_zip <src_dir> <slug>
build_zip() {
  local src_dir="$1" slug="$2"
  local staged="$STAGING_ROOT/$slug.src"
  local args=()
  local pattern

  command -v rsync >/dev/null 2>&1 \
    || fail 'rsync not found (required for exclusion filtering)' 1
  command -v python3 >/dev/null 2>&1 \
    || fail 'python3 not found (required for deterministic zipping)' 1

  for pattern in "${EXCLUDES[@]}"; do
    args+=(--exclude "$pattern")
  done

  mkdir -p "$staged"
  rm -rf "${staged:?}/"*

  # Filter into the staging dir (all exclusions applied here, once).
  rsync -a --delete "${args[@]}" "${src_dir%/}/" "$staged/" \
    || fail 'rsync staging failed (see errors above)' 2

  # Deterministic zip: sorted names, fixed timestamp, fixed perms, no
  # ownership noise — same tree ⇒ same bytes.
  (cd "$staged" && python3 - <<'PY'
import os
import zipfile

entries = []
for dirpath, dirnames, filenames in os.walk('.'):
    dirnames.sort()
    for name in filenames:
        entries.append(
            os.path.relpath(os.path.join(dirpath, name), '.'))
entries.sort()
with zipfile.ZipFile('../__out.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for rel in entries:
        info = zipfile.ZipInfo(rel, date_time=(2025, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        with open(rel, 'rb') as fh:
            zf.writestr(info, fh.read())
print(f'packed {len(entries)} files')
PY
  ) || fail 'python zip step failed' 3
  mv "$STAGING_ROOT/__out.zip" "$STAGING_ROOT/$slug.zip"
  rm -rf "$staged"
}

# ── self-test ────────────────────────────────────────────────────────────────
self_test() {
  local tmp rc=0
  tmp="$(mktemp -d)"

  # Synthetic tree: real files + junk from every exclusion family
  mkdir -p "$tmp/src/media" "$tmp/src/.git" "$tmp/src/srcs" \
           "$tmp/src/node_modules/pkg" "$tmp/src/__pycache__" \
           "$tmp/src/.venv/lib"
  echo 'int main(void){return 0;}' > "$tmp/src/main.c"
  echo 'CC = gcc'                  > "$tmp/src/Makefile"
  echo 'code'                      > "$tmp/src/srcs/parse.c"
  echo 'ref'                       > "$tmp/src/.git/HEAD"
  echo 'ref'                       > "$tmp/src/.gitignore"
  echo 'junk'                      > "$tmp/src/media/commands.gif"
  echo 'junk'                      > "$tmp/src/media/prompt.png"
  echo 'kept'                      > "$tmp/src/media/other.txt"
  echo 'junk'                      > "$tmp/src/node_modules/pkg/x.js"
  echo 'junk'                      > "$tmp/src/__pycache__/x.pyc"
  echo 'junk'                      > "$tmp/src/.venv/lib/y.py"
  echo 'junk'                      > "$tmp/src/extra.o"
  echo 'junk'                      > "$tmp/src/.DS_Store"
  echo 'secrets'                   > "$tmp/src/.env.local"

  STAGING_ROOT="$tmp/staging" build_zip "$tmp/src" selftest
  STAGING_ROOT="$tmp/staging" build_zip "$tmp/src" selftest2

  local h1 h2
  h1="$(sha256sum "$tmp/staging/selftest.zip" | awk '{print $1}')"
  h2="$(sha256sum "$tmp/staging/selftest2.zip" | awk '{print $1}')"
  if [ "$h1" != "$h2" ]; then
    rm -rf "$tmp"
    echo 'SELF-TEST FAIL: not deterministic'
    exit 4
  fi
  echo 'determinism: PASS (two builds, identical sha256)'

  python3 - "$tmp/staging/selftest.zip" <<'PY' || rc=1
import sys
import zipfile

names = set(zipfile.ZipFile(sys.argv[1]).namelist())
expected = {'main.c', 'Makefile', 'srcs/parse.c', 'media/other.txt'}
missing = expected - names
leaked = names - expected
if missing or leaked:
    print(f'SELF-TEST FAIL: missing={sorted(missing)} '
          f'leaked={sorted(leaked)}')
    sys.exit(1)
print('exclusions: PASS (junk excluded, real files kept)')
PY
  rm -rf "$tmp"
  [ "$rc" -eq 0 ] || exit 4
  echo 'SELF-TEST OK'
}

# ── arg parsing ──────────────────────────────────────────────────────────────
if [ "${1:-}" = '--check' ]; then
  self_test
  exit 0
fi
[ $# -ge 2 ] || { usage >&2; echo >&2; fail 'src_dir and slug required' 1; }

SRC_DIR="$1"; shift
SLUG="$1"; shift
while [ $# -gt 0 ]; do
  case "$1" in
    --extra-exclude)
      [ $# -ge 2 ] || fail '--extra-exclude needs a GLOB' 1
      EXCLUDES+=("$2"); shift 2 ;;
    *) usage >&2; echo >&2; fail "unknown argument: $1" 1 ;;
  esac
done

[ -d "$SRC_DIR" ] || fail "src_dir not found: $SRC_DIR" 1
# Slug shape = what the terminal service uses in paths (safe_join_path).
[[ "$SLUG" =~ ^[a-zA-Z0-9_-]+$ ]] \
  || fail "slug must be [a-zA-Z0-9_-]+ (got: $SLUG)" 1

mkdir -p "$STAGING_ROOT"
build_zip "$(cd "$SRC_DIR" && pwd)" "$SLUG"

OUT="$STAGING_ROOT/$SLUG.zip"
SIZE=$(stat -c%s "$OUT")
FILES=$(python3 - "$OUT" <<'PY'
import sys
import zipfile

print(sum(1 for n in zipfile.ZipFile(sys.argv[1]).namelist()
          if not n.endswith('/')))
PY
)

# Verify: readable zip, no excluded families leaked.
python3 - "$OUT" <<'PY' || fail 'zip verification failed' 4
import re
import sys
import zipfile

zf = zipfile.ZipFile(sys.argv[1])
corrupt = zf.testzip()
if corrupt is not None:
    print(f'VERIFY FAIL: corrupt member: {corrupt}')
    sys.exit(1)
leak = [n for n in zf.namelist() if re.search(
    r'(^|/)\.git(/|$)|(^|/)node_modules(/|$)|__pycache__|'
    r'\.pyc$|\.o$|\.so$|\.env($|\.)|(^|/)media/.*\.(gif|png|jpg)$', n)]
if leak:
    print(f'VERIFY FAIL: excluded families leaked: {leak}')
    sys.exit(1)
print('VERIFY OK: zip readable, no excluded families present')
PY

MB=$(awk -v s="$SIZE" 'BEGIN{printf "%.2f", s/1048576}')
printf 'artifact: %s\nsize:     %s bytes (%s MB)\nfiles:    %s\n' \
  "$OUT" "$SIZE" "$MB" "$FILES"
printf 'sha256:   %s\n' "$(sha256sum "$OUT" | awk '{print $1}')"
echo 'NOT uploaded — upload explicitly via portfolio_api/scripts/r2_demo_zip.py'
