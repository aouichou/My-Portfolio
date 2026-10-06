#!/usr/bin/env python3
"""
make-font-placeholders.py — F3-06a

Generates VALID minimal woff2 placeholder files for next/font/local so
the Next.js dev server / build pass before the real Inter / Inter
Display / IBM Plex Mono binaries are fetched (see scripts/fetch-fonts.sh
for the network path; this script is the offline fallback).

Why: next/font/local parses each woff2 at compile time (size-adjust
fallback metrics). A 0-byte file fails that parse. A real, minimal,
valid woff2 (a few glyphs from the DejaVu family already on this
system) parses cleanly; `display: 'swap'` + the token stack's system
fallback chain mean the placeholders are never user-visible.

The placeholders are gitignored (*.woff2) — they exist only to satisfy
the compiler locally / in CI. Run again after cloning:

    python3 scripts/make-font-placeholders.py

(requires: fonttools + brotli — `pip install fonttools brotli`)

When the REAL binaries are fetched per the README, simply overwrite
the placeholder files; nothing else changes.
"""

import sys
from pathlib import Path

try:
    from fontTools.subset import Options, Subsetter, load_font, save_font
except ImportError:
    print(
        "fonttools missing — install with: pip install fonttools brotli",
        file=sys.stderr,
    )
    sys.exit(1)

# A real TTF already present on Debian/Ubuntu systems.
SOURCE_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]

# The exact files next/font/local expects (src/app/fonts.ts).
# F3-06b: Inter 4.1 has NO InterDisplayVariable (Display is static-only)
# — placeholders mirror the fetch-fonts.sh manifest.
TARGETS = [
    "InterVariable.woff2",
    "InterDisplay-Regular.woff2",
    "InterDisplay-Medium.woff2",
    "InterDisplay-SemiBold.woff2",
    "IBMPlexMono-Regular.woff2",
    "IBMPlexMono-Medium.woff2",
    "IBMPlexMono-Bold.woff2",
]

# Keep only the visible-ASCII range — smallest valid subset.
UNICODES = "U+0020-007E"


def main() -> int:
    source = next((p for p in SOURCE_CANDIDATES if Path(p).exists()), None)
    if not source:
        print("No source TTF found in:", SOURCE_CANDIDATES, file=sys.stderr)
        return 1

    out_dir = Path(__file__).resolve().parent.parent / "public" / "fonts"
    out_dir.mkdir(parents=True, exist_ok=True)

    for target in TARGETS:
        options = Options()
        options.flavor = "woff2"
        options.layout_features = ["*"]
        font = load_font(source, options)
        subsetter = Subsetter(options=options)
        subsetter.populate(unicodes=list(range(0x20, 0x7F)))
        subsetter.subset(font)
        out = out_dir / target
        save_font(font, str(out), options)
        print(f"  wrote {out.relative_to(out_dir.parent.parent)} ({out.stat().st_size} bytes)")

    print("Placeholder woff2 files written — valid fonts, ASCII subset.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
