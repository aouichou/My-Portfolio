#!/usr/bin/env bash
#
# fetch-fonts.sh — F3-06b
#
# Downloads the REAL font binaries for the v2 design system (brief §2.2)
# into public/fonts/ (gitignored — binaries are never committed).
#
# Sources are DETERMINISTIC and official:
#   - Inter 4.1 (incl. Inter Display statics) — rsms/inter GitHub release
#     zip, exact tag v4.1
#   - IBM Plex Mono 6.4.1 statics — IBM/plex repo raw files, exact tag
#     v6.4.1 (the npm @ibm/plex package is >150 MB and jsdelivr refuses
#     to serve it — the repo raw path is the stable alternative)
#
# Every file is verified by SHA-256 before being moved into place; a
# checksum mismatch aborts WITHOUT touching public/fonts/.
#
# Inter Display note: Inter 4.x ships NO InterDisplayVariable — the
# Display optical size is static-only in the official release. The brief
# needs weights 400/500/600, so we fetch Regular/Medium/SemiBold statics
# and src/app/fonts.ts registers them as a 3-file weight set.
#
# Requirements: curl, unzip, sha256sum (coreutils), mktemp.
#
set -euo pipefail

DEST="$(cd "$(dirname "$0")/.." && pwd)/public/fonts"
INTER_ZIP_URL="https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip"
PLEX_BASE="https://github.com/IBM/plex/raw/v6.4.1/IBM-Plex-Mono/fonts/complete/woff2"

# name-in-download -> expected sha256 -> final name in public/fonts/
declare -A INTER_FILES=(
  ["web/InterVariable.woff2"]="693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3|InterVariable.woff2"
  ["web/InterDisplay-Regular.woff2"]="3a9463a58c3e7ba1e3cd65b5dbff91a35c508ff78a104cd1121feff83efeb787|InterDisplay-Regular.woff2"
  ["web/InterDisplay-Medium.woff2"]="f1227907684853882ad00d7f97ce9f64bc17b89a2a291a7d4ec84fccfa442934|InterDisplay-Medium.woff2"
  ["web/InterDisplay-SemiBold.woff2"]="d9f63a82b826fb0117c92715c3a52a2d2247bc321bc39341420bf52d91e8277a|InterDisplay-SemiBold.woff2"
)

declare -A PLEX_FILES=(
  ["IBMPlexMono-Regular.woff2"]="49ce58b41a0e1cb921c0f58d9a5b8b96a2cc21437c7066f3ba4f24873076d131"
  ["IBMPlexMono-Medium.woff2"]="8c2c290cbd998fa1f647e4572aca6ebbd72589551b0f3f9f8bb8628fbb8219d5"
  ["IBMPlexMono-Bold.woff2"]="5788454f0ba4bd6300752c474215c4dd926682fa173ae1c6252d57828b6a235d"
)

check() { # <path> <expected-sha256>
  local got
  got="$(sha256sum "$1" | awk '{print $1}')"
  if [ "$got" != "$2" ]; then
    echo "CHECKSUM MISMATCH: $1" >&2
    echo "  expected $2" >&2
    echo "  got      $got" >&2
    return 1
  fi
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Downloading Inter 4.1 release zip…"
curl -fsSL --retry 3 -o "$WORK/Inter-4.1.zip" "$INTER_ZIP_URL"

echo "==> Extracting + verifying Inter files…"
for member in "${!INTER_FILES[@]}"; do
  expected="${INTER_FILES[$member]%%|*}"
  final="${INTER_FILES[$member]##*|}"
  unzip -o -q "$WORK/Inter-4.1.zip" "$member" -d "$WORK/inter"
  check "$WORK/inter/$member" "$expected"
  mkdir -p "$DEST"
  mv "$WORK/inter/$member" "$DEST/$final"
  echo "  ✓ $final"
done

echo "==> Downloading + verifying IBM Plex Mono 6.4.1…"
for name in "${!PLEX_FILES[@]}"; do
  expected="${PLEX_FILES[$name]}"
  curl -fsSL --retry 3 -o "$WORK/$name" "$PLEX_BASE/$name"
  check "$WORK/$name" "$expected"
  mv "$WORK/$name" "$DEST/$name"
  echo "  ✓ $name"
done

# Keep the OFL license next to the binaries (both families, OFL 1.1).
unzip -o -q "$WORK/Inter-4.1.zip" LICENSE.txt -d "$WORK/inter"
mv "$WORK/inter/LICENSE.txt" "$DEST/LICENSE-Inter.txt"
curl -fsSL --retry 3 -o "$DEST/LICENSE-IBM-Plex.txt" \
  "https://github.com/IBM/plex/raw/v6.4.1/LICENSE.txt"
echo "  ✓ licenses"

echo "==> Done. Real binaries in $DEST:"
ls -la "$DEST"
