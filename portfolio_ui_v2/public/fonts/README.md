# Self-hosted fonts — fetch, don't commit

The design system (visual-identity-brief §2.2) uses exactly two font
families, both SIL OFL 1.1, both self-hosted via `next/font/local`:

| Family            | Files needed                          | Weights    |
| ----------------- | ------------------------------------- | ---------- |
| Inter             | `InterVariable.woff2`                 | 400–600    |
| Inter Display     | `InterDisplayVariable.woff2`          | 400–600    |
| IBM Plex Mono     | `IBMPlexMono-Regular.woff2`, `IBMPlexMono-Medium.woff2`, `IBMPlexMono-Bold.woff2` | 400, 500, 600 |

Font binaries are never committed to git.

## Fetch (official sources)

```sh
# Inter + Inter Display — official repo (Rasmus Antvorskov et al., OFL 1.1)
# https://github.com/rsms/inter/releases — download the latest zip, then:
unzip Inter-*.zip -d /tmp/inter
cp /tmp/inter/extras/ttf/InterVariable.ttf .
cp /tmp/inter/extras/ttf/InterDisplayVariable.ttf .

# IBM Plex Mono — official repo (IBM, OFL 1.1)
# https://github.com/IBM/plex/releases — download, then from the unzip:
cp ibm-plex*/IBM-Plex-Mono/fonts/complete/woff2/IBMPlexMono-*.woff2 .
```

Convert TTF→WOFF2 if needed: `python3 -m fonttools.ttLib.woff2 compress InterVariable.ttf`

## Fallback (until binaries land)

`src/app/fonts.ts` reads `fs.existsSync` and falls back to the brief's
system stack when files are absent, so every gate (type-check, jest,
lint, build) passes without binaries present.

## Manifest

- Inter: <https://github.com/rsms/inter> — OFL 1.1
- IBM Plex Mono: <https://github.com/IBM/plex> — OFL 1.1
- No other fonts may enter the bundle (brief §6 blacklist: exactly 2
  families).
