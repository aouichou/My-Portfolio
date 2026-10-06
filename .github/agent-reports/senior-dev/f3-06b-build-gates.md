# F3-06b — Build gates, real font wiring, terminal-theme connection

**Agent**: Senior Dev · **Date**: 2026-10-06 · **Branch**: `rework/v2` (base `777142d`)
**Slice**: 2 of 2 of the F3-06 scaffold · **Spec**: brief §7.3, §7.4, F3-06a handoff report

---

## Outcome summary

| Deliverable | State |
|---|---|
| `next build` gate | ✅ green, zero ignored errors (no `ignoreBuildErrors`/`ignoreDuringBuilds` anywhere) |
| `test:ci` full chain | ✅ `lint && type-check && test:unit-ci && test:tokens && build` — **exit 0** |
| Real fonts | ✅ **LANDED** — deterministic SHA-256-pinned fetch script; placeholders gone; `preload: true` verified in built HTML |
| `terminalTheme` → LiveTerminal | ✅ wired, mode-reactive (teardown+re-init on mode change — rationale below), pinned by 2 new tests |
| Dev-stack smoke | ✅ `next dev` + API containers → `/` = 200; contract call from node: `200, count=12, first=fdf-wireframe-renderer` |

**Real fonts or placeholders?** REAL. `scripts/fetch-fonts.sh` ran successfully
over the network; `public/fonts/` now holds the genuine binaries (352 KB
InterVariable + 3×~110 KB Inter Display statics + 3×~46 KB IBM Plex Mono).
The placeholder generator remains as the documented offline fallback.

---

## 1. `next build` gate

First run surfaced ONE issue — not a type/lint failure but a Turbopack
warning: a stray `~/package-lock.json` (outside the repo) was being
considered:

```
⚠ Warning: Next.js ignored package-lock.json in /home/amine because it is outside
the current Git repository (/home/amine/Code/My-Portfolio).
```

Fixed by scoping (never by suppressing): `next.config.ts` now pins

```ts
turbopack: { root: join(__dirname, '..', '..') },
```

Post-fix build (with real fonts, `preload: true`):

```
▲ Next.js 16.4.0 (Turbopack)
✓ Running next.config.ts took 31ms
  Creating an optimized production build ...
✓ Compiled successfully in 492ms
  Running TypeScript ...
  Finished TypeScript in 1499ms ...
  Collecting page data using 4 workers ...
  Generating static pages using 4 workers (3/3) in 436ms
Route (app)
┌ ○ /
└ ○ /_not-found
```

TypeScript runs INSIDE the build (Next 16 strictness) — zero errors, zero
suppressions. Placeholder strategy note from the task proved unnecessary:
the valid-subset placeholders compiled fine under build (verified before
the real fonts landed); no strategy change was needed.

## 2. Font binaries — `scripts/fetch-fonts.sh`

**Discovery that reshaped the wiring**: Inter 4.1 ships **no
`InterDisplayVariable.woff2`** — the Display optical size is static-only
in the official release. The brief needs 400/500/600, so
`src/app/fonts.ts` now registers Inter Display as a 3-file static weight
set (`Regular`/`Medium`/`SemiBold`). The stale
`InterDisplayVariable.woff2` placeholder was deleted.

Deterministic sources (exact tags, SHA-256-pinned in the script —
mismatch aborts before touching `public/fonts/`):

| File | Source | sha256 (prefix) |
|---|---|---|
| `InterVariable.woff2` | rsms/inter release zip `v4.1` → `web/` | `693b77d4…` |
| `InterDisplay-{Regular,Medium,SemiBold}.woff2` | same zip → `web/` | `3a9463a5…`/`f1227907…`/`d9f63a82…` |
| `IBMPlexMono-{Regular,Medium,Bold}.woff2` | IBM/plex repo raw @ `v6.4.1` | `49ce58b4…`/`8c2c290c…`/`5788454f…` |
| `LICENSE-{Inter,IBM-Plex}.txt` | same tags | — |

Why GitHub-raw for Plex: the `@ibm/plex` npm package exceeds jsdelivr's
150 MB package limit (`Package size exceeded the configured limit of
150 MB.`) — the repo raw path at an exact tag is equally deterministic.

`preload: true` flipped on all three loaders; verified in the built HTML:

```
rel="preload" href="/_next/static/media/IBMPlexMono_Bold-s.p.….woff2" as="font" crossorigin="" type="font/woff2
…
InterVariable-s.p.2c0y96ae70xfx.woff2   (also served by next dev)
```

`.gitignore`: added `LICENSE-*.txt` + explicit `!README.md`; binaries
remain untracked (`git status` clean of them).

`make-font-placeholders.py` target list updated to the new 7-file
manifest (offline path stays viable).

## 3. `terminalTheme` → LiveTerminal (brief §7.3)

The hardcoded `#1e1e1e`-palette `Terminal({ theme })` is gone:

```ts
const { theme } = useTheme();                      // mode-reactive source
…
fontFamily: "var(--font-plex-mono), 'MesloLGS NF', ui-monospace, 'SF Mono', Menlo, monospace",
theme: terminalTheme(theme),                        // tokens, not a palette
…
}, [slug, authToken, theme]);                       // theme is a REAL dep
```

**Mode-reactivity choice (documented)**: teardown + re-init. Mutating
`term.options.theme` on a LIVE xterm session leaves already-painted
ANSI-mapped text in old colors (xterm only re-themes the buffer chrome,
not re-rendered cells from the PTY stream). Re-running the init effect on
`theme` change disposes the old terminal and mounts a fresh one with the
new token-derived palette — clean repaint, and the wire protocol is
untouched (socket teardown/rebuild is the same path `slug`/`authToken`
changes already exercise; the capture suite pins that lifecycle).
Cost: a WS reconnect on mode flip — acceptable for a demo surface, and
strictly better than a half-recolored terminal. Font keeps `MesloLGS NF`
as glyph fallback per §7.3's explicit allowance.

**Tests (117 → 119)**: the suite's `FakeTerminal` now records
constructor options + `disposed`. New pins:
1. light-mode init: `options.theme` deep-equals `terminalTheme('light')`
   (canvas `#ffffff` body, amber `#ad5700` cursor spot-checked) +
   `fontFamily` contains `var(--font-plex-mono)` and no hardcoded face;
2. mode flip: `ThemeProvider` + probe setter flips to dark → first
   terminal `disposed`, second created with `terminalTheme('dark')`
   (`#161719` surface body, `#ffb224` cursor).

All 117 pre-existing tests unchanged and green — the wiring is
behavior-preserving where it must be (wire protocol) and intentional
where it changes (theme).

## 4. Dev-stack integration smoke

API containers (db/redis/backend) started from `docker-compose.dev.yml`.
With the env vars the task specified:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api SERVER_API_URL=http://localhost:8000/api npm run dev -- -p 3100
→ ✓ Ready in 413ms
→ curl / → 200  (page: nameplate <h1>, data-mode boot script ×2, real InterVariable asset)
→ node contract call GET /api/projects/?page_size=3 → 200, count=12, first=fdf-wireframe-renderer
```

The placeholder page does no data fetching (pages come next) — proven
boot-with-right-env plus a live contract call from the app's node context.
Note: `/api/health/` doesn't exist; the root `/api/` is the health probe
(`{"status":"ok","service":"portfolio-api"}`).

## 5. Full gate chain (`npm run test:ci`) — pasted output

```
> portfolio_ui_v2@0.1.0 test:ci
> npm run lint && npm run type-check && npm run test:unit-ci && npm run test:tokens && npm run build
> eslint .                                    (0 problems)
> tsc --noEmit                                (clean)
> jest --ci --coverage --watchAll=false
Test Suites: 9 passed, 9 total
Tests:       119 passed, 119 total
> node scripts/check-tokens.mjs
✔ token guard PASSED — 21/21 tokens present in compiled globals.css; blacklist clean.
> next build
✓ Compiled successfully in 595ms
  Generating static pages using 4 workers (3/3) in 421ms
CHAIN-EXIT=0
```

Script rename: the old jest-only `test:ci` became `test:unit-ci`;
`test:ci` is now the full five-stage chain (breaking change for any CI
wiring — none exists yet for v2; CI consolidation is Phase 5).

## 6. Files changed

| File | Change |
|---|---|
| `scripts/fetch-fonts.sh` | NEW — deterministic, checksum-pinned font fetch |
| `src/app/fonts.ts` | Display statics (3 weights), `preload: true`, updated docs |
| `src/components/LiveTerminal.tsx` | terminalTheme wiring + mode-reactive re-init |
| `__tests__/unit/components/LiveTerminal.test.tsx` | options/dispose capture + 2 theme pins |
| `package.json` | `test:ci` = full chain; `test:unit-ci` split out |
| `next.config.ts` | `turbopack.root` pinned (stray-lockfile warning killed by scoping) |
| `public/fonts/README.md` | script-first docs; Display-statics reality; offline fallback |
| `scripts/make-font-placeholders.py` | target list → 7-file manifest |
| `.gitignore` | `LICENSE-*.txt` ignored; README explicitly kept |

## 7. Open items handed forward

- `--font-display` still not referenced by a display token (nameplate
  component work, F3-07+) — `interDisplay.variable` is set on `<html>`
  and ready.
- ThemeContext `system` mode (§7.2) arrives with the toggle component.
- WS-reconnect-on-mode-flip: if the terminal-hero page later holds live
  sessions users flip modes on, consider `term.options.theme` patch +
  `term.clear()` trade-off there (page-slice decision, not scaffold's).
- CLS measurement (§7.4.6) needs real pages to measure against.
