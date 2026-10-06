# Self-hosted fonts — fetched by script, never committed

The design system (visual-identity-brief §2.2) uses exactly two font
families, both SIL OFL 1.1, both self-hosted via `next/font/local`:

| Family        | Files (in this dir) | Weights |
| ------------- | ------------------- | ------- |
| Inter         | `InterVariable.woff2` (variable, 100–900) | 400/500/600 used |
| Inter Display | `InterDisplay-Regular/Medium/SemiBold.woff2` (statics) | 400/500/600 |
| IBM Plex Mono | `IBMPlexMono-Regular/Medium/Bold.woff2` | 400/500/600 |

**Inter 4.1 ships no `InterDisplayVariable`** — the Display optical size
is static-only in the official release, hence the three static weights.

## Fetch (deterministic, checksum-pinned)

```sh
./scripts/fetch-fonts.sh
```

Downloads from official sources at exact tags and verifies every file
against a pinned SHA-256 before moving it into place:

- Inter + Inter Display: `rsms/inter` release zip `v4.1`
  (github.com/rsms/inter/releases)
- IBM Plex Mono: `IBM/plex` repo raw files at tag `v6.4.1`
  (the `@ibm/plex` npm package exceeds jsdelivr's 150 MB limit —
  the repo raw path is the stable deterministic alternative)

Font binaries and the fetched LICENSE files are gitignored
(`*.woff2`, `LICENSE-*.txt` in the root `.gitignore`).

## Offline fallback (placeholder strategy)

Without network access, generate valid minimal woff2 subsets so
`next/font/local` still compiles (0-byte stubs break the build — see
LESSONS.md):

```sh
python3 scripts/make-font-placeholders.py   # needs fonttools + brotli
```

Placeholders are dev-only; overwrite them with `fetch-fonts.sh` when
network returns.

## Manifest

- Inter: <https://github.com/rsms/inter> — OFL 1.1
- IBM Plex Mono: <https://github.com/IBM/plex> — OFL 1.1
- No other fonts may enter the bundle (brief §6 blacklist: exactly 2
  families).
