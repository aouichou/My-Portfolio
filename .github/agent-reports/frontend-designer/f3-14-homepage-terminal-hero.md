# F3-14 — Homepage: the live terminal as hero (THE signature)

**Agent**: Frontend Designer · **Date**: 2026-10-08 · **Commit**: `fd954ee` (`rework/v2`, not pushed)
**Brief**: `docs/designs/2026-10-03-visual-identity-brief.md` §1, §3 candidate A, §4.4, §5

---

## 1. What shipped

The homepage is now the approved signature: **a real shell the visitor can
type into, seconds after landing, mounted inside the typographic nameplate.**

| Piece | File | What it is |
|---|---|---|
| Homepage composition | `portfolio_ui_v2/src/app/page.tsx` | Server component: nameplate (name huge in Inter Display) → ONE amber rule → terminal plate → typed hint → lede → featured work → doors. Typed fetches, each degrading independently. |
| Terminal hero wrapper | `portfolio_ui_v2/src/components/TerminalHero.tsx` | NEW client island: dormant-plate button → first-interaction activation → lazy `LiveTerminal` mount. `has_demo` gate with designed degradation. |
| First-contact moment | `portfolio_ui_v2/src/app/globals.css` | §4.4 choreography as `fc-*` keyframes — the ONLY keyframe block in the codebase, all durations × `--motion-scale`. |
| LiveTerminal reskin | `portfolio_ui_v2/src/components/LiveTerminal.tsx` | v1's loading/error overlays (black scrim, blue spinner, red-900 panel) → token surfaces. Copy strings unchanged (capture-pinned). |
| Tests | `portfolio_ui_v2/__tests__/unit/app/HomePage.test.tsx` | 13 new: nameplate, mount gating, degradation, curation, doors, SEO, motion contract. |
| Dev CORS | `portfolio_api/portfolio_api/settings.py` + `docker-compose.dev.yml` | `:3100` origin allowed for the browser-side token mint (see §5). |

---

## 2. Composition rationale (brief §3 A mounted in B's chassis)

```
┌────────────────────────────────────────────────────┐
│ Amine Aouichou                    ← display-lg 600  │  fc-name sets (400ms)
│ Full-stack engineer. I build…     ← body-lg muted   │
│ ━━━━━                             ← ONE amber rule  │  fc-rule draws (next 400ms)
│ ┌────────────────────────────────────────────────┐ │
│ │ minishell — live demo                ●         │ │  titlebar: mono, amber dot =
│ │                                                │ │  status cue (solid=enabled)
│ │         $ ready — press to connect              │ │  fc-pane rises 16px        ← dormant plate:
│ │   Opens a real shell with the minishell        │ │  THE first-interaction gate
│ │   source. Nothing else runs until you do.      │ │
│ └────────────────────────────────────────────────┘ │
│ type 'help' below to look around   ← mono muted    │  fc-type types itself (last)
│                                                    │
│ Selected work                        All projects → │  7 featured ProjectCards
│ [card] [card] [card] …                            │  image-first (Batman rule)
│ ────────────────────────────────────────────────── │
│ Where I've worked            Who I am              │  one-line doors
└────────────────────────────────────────────────────┘
```

Decisions, with the why:

1. **Terminal as the central plate UNDER the name** — "mounted in the
   nameplate" (brief §1/§3A) reads literally: the name IS the plate's
   caption. Full container width (1120px) so the shell is usable, not a
   toy; the plate uses `--radius-lg` (12px, the terminal window value)
   and `--shadow-card`.
2. **The dormant plate is a button, not an auto-connect** — session
   frugality (dispatch): LiveTerminal mints its guest token ON MOUNT, so
   gating the mount = gating the session. No scroll-by burns a JWT + a
   bash slot (cap is 10). The button copy follows §5.5: it says exactly
   what happens ("press to connect", "Opens a real shell…").
3. **Titlebar instead of fake traffic lights** — one mono line
   (`minishell — live demo`) + a status dot: solid amber = enabled,
   `line` gray = offline. This is a plate, not a macOS window costume.
4. **ONE amber rule, above the terminal** — the §1 "type, paper, and one
   amber line" line. It participates in first contact (draws left-to-right).
5. **Featured work below, quiet** — homepage IS the featuring surface now
   (Q1 decision). Existing `ProjectCard` (image-first, Batman's rule) in
   the standard 1/2/3-col grid; the homepage filters the ledger by
   `is_featured` and renders in API order (7 cards, verified live);
   section grouping stays on /projects.
6. **Doors, not cards** — Experience/About as one-line text links under a
   hairline. The hero owns the boldness budget; the bottom of the page
   whispers.

---

## 3. First contact (§4.4) — the ONE orchestrated moment

Sequence (homepage only, runs once, `both` fill-mode):

| t | Element | Motion |
|---|---|---|
| 0ms | nameplate (`.fc-name`) | sets: opacity 0→1, translateY 16px→0, 400ms ease-out |
| +400ms | amber rule (`.fc-rule`) | draws: scaleX 0→1 from left, 400ms |
| +600ms | terminal pane (`.fc-pane`) | rises 16px into place, 400ms |
| +1000ms | hint line (`.fc-type`) | types itself: max-width 0→26ch, 240ms steps(26) |

Total ≤ **1.24s** at scale 1 (brief budget 1.2s — the caret blink is xterm's
own, not counted; sequence is 1.0s to the pane landing, the type-in rides
the tail). Every duration is `calc(var(--dur-*) * var(--motion-scale))`:
`prefers-reduced-motion: reduce` zeroes the dial (§4.1) → durations
collapse to 0 and everything renders at final state — no reflow, no
re-timing, identical DOM (pinned by test). Nothing else on the page moves;
scroll reveals are NOT used on the homepage (the hero is the moment).

---

## 4. Terminal hero behavior

- **Context**: fixed `minishell` (the only project with a real demo zip in
  R2: `project-files/minishell.zip`, 74MB — verified on disk and via the
  terminal service's DEBUG copy path).
- **Wiring**: server page fetches `getProjectBySlug('minishell')` (typed),
  passes `Pick<ProjectDetail, 'slug' | 'has_demo'>` through to the hero.
  `has_demo=false` (prod today) → the designed degradation: quiet
  "Demo offline" + "View the project instead" door. Fetch failure → same
  plate. **No fake terminal anywhere.**
- **Activation**: LiveTerminal's own init semantics (checked): it mints on
  MOUNT, then opens the WS after a 1s init timer. So the hero renders a
  dormant plate until the visitor's first interaction with the terminal
  area (click/Enter/Space on the button — a real `<button>`, keyboard
  focusable, global accent `:focus-visible` ring), THEN mounts
  LiveTerminal via `React.lazy` (xterm stays out of the initial chunk;
  Suspense fallback = reserved-height quiet line, no spinner).
- **A11y**: region has `aria-label="Live terminal — minishell demo"`;
  activation button labeled; the hint line is `aria-hidden` (decorative
  echo of the affordance).

## 5. The dev-DB `has_demo` flip (documented, reversible)

`has_demo=false` on ALL 12 projects (v1 never maintained it). The hero
needs a live session → flipped for `minishell` in LOCAL dev only:

```bash
docker exec portfolio-db-dev psql -U postgres -d portfolio_dev \
  -c "UPDATE projects_project SET has_demo = true WHERE slug = 'minishell';"
```

Revert: same command with `false`. Prod flips via admin/Phase 4 curation
(DB-driven enablement already planned — Batman's terminal note).

**Discovered + fixed en route**: the browser mint (`withCredentials: true`)
from the v2 dev origin `:3100` was blocked — F2's CORS hardening
hardcoded the prod allowlist and orphaned the compose
`CORS_ALLOWED_ORIGINS` env (dead config). Fix (dev-only, hygiene-safe):
`settings.py` appends the env var's origins ONLY when `DEBUG` — the
single `CORS_ALLOWED_ORIGINS =` assignment the hygiene suite pins is
untouched; `test_settings_hygiene.py` + full API suite 354/354 green.
Compose now sets `:3000` + `:3100`.

## 6. SEO/meta

`metadata` API: title `Amine Aouichou — full-stack engineer`; recruiter
description (42 Paris + Qynapse, zero banned vocabulary); OG title/description/
type=website. **og:image deliberately skipped** — no amber-on-paper asset
exists; Phase 5 note recorded in the page source.

---

## 7. Gates — evidence

| Gate | Result |
|---|---|
| lint | PASS (clean) |
| type-check | PASS |
| unit suite | **262/262** (249 existing + 13 new), 23 suites |
| token guard | PASS 21/21; blacklist clean |
| build | PASS — `/` dynamic, all routes compiled |
| API suite (settings change) | **354/354** |

### Live smoke (docker was down → started: db/redis/backend/terminal)

- `:8000/healthz` → 200
- `:3100/` SSR → 200; composition checklist 11/11 PASS (nameplate, fc-*
  classes, region label, dormant button, no offline plate with has_demo=true,
  Selected work, doors, og tags)
- **Degradation live-proven**: flipped `has_demo=false` → SSR renders
  "Demo offline" + door; restored `true`
- **The hero chain, exactly as the browser will run it**:
  - Guest token minted from `Origin: http://localhost:3100` →
    `access-control-allow-origin: http://localhost:3100`,
    `access-control-allow-credentials: true` (CORS fix verified)
  - WS connected: `ws://localhost:8001/terminal/minishell/`
  - Startup output: `✅ Project files downloaded successfully! … Welcome to
    minishell terminal! Type 'ls' to see project files.`
  - Typed `echo HERO_OK_$((40+2))` → **`HERO_OK_42` returned — real bash
    answered** (line-validated input frames)

---

## 8. Self-critique vs the blacklist + signature checklist

- §6 greps on changed files: **1 hit** — the word "red-900" inside a
  comment *describing the reskin away*. Zero code hits: no gradients, no
  blur/glass, no glow, no clip-text, no hover:scale, no raw hex in JSX.
- Motion: one keyframe block, shared, dial-scaled; no springs; the only
  loop remains the caret blink (xterm's own).
- Signature check: *type in a real shell seconds after landing* — YES
  (press → live bash; verified end-to-end). One signature per screen —
  yes (nothing else on the homepage animates).
- Residual risks, honestly: (a) 74MB first-download on the demo zip takes
  ~10–15s in dev — the pane prints the service's progress lines (designed
  loading state per brief §3A cost b); a smaller demo zip or pre-warm is a
  Phase 4 lever. (b) The dormant plate adds one interaction before typing
  — deliberate (session frugality); if Batman wants auto-connect for
  logged scroll-depth, it's a one-prop change. (c) og:image absent (Phase 5).

## 9. Handoff

- `ContactForm.tsx` formatter artifact left uncommitted (Batman's pending
  chore-commit call — SESSION.md).
- Phase 4: DB-driven demo enablement; more demo zips; `/demo/[slug]` full
  shell keeps MFA; homepage hero needs none.
- For Batman's local review: `docker compose -f docker-compose.dev.yml up
  -d db redis backend terminal`, flip command in §5, then
  `cd portfolio_ui_v2 && npm run dev -- -p 3100`.
