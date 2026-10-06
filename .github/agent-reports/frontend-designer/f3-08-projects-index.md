# F3-08 — Projects index (first data-driven page)

**Agent**: Frontend Designer · **Date**: 2026-10-07 · **Branch**: `rework/v2`
**Commits**: `5ed1877` (42 Paris content fix, pre-existing edit) → `6955124` (F3-08). Not pushed.

---

## The design call: sections, not a filter row

**Chosen: three type-distinct sections in fixed order (internship → school →
personal). No filter row.**

Why:

1. **The brief already decided this.** §2.5 (binding): "Grouping is primary:
   the projects index renders three sections in a fixed order (internship →
   school → personal), each opened by `title-2` + a one-line scope note."
   The overline-on-card is the *secondary* encoding. A filter row would
   replace structure-on-arrival with structure-on-demand — the exact
   inversion §2.5 prescribes against.
2. **The data agrees.** 12 projects / 3 types is a complete, single-screen
   ledger. Filters earn their cost when a list is long enough to need
   cutting; 12 items fit in one scroll. Q1 (full ledger) is answered by the
   page itself: everything renders, nothing gated.
3. **Structure-is-information fits épurer.** The fixed order tells the
   reader the hierarchy of the CV (industry first, then fundamentals, then
   self-directed) without a single decorative element. A filter row adds a
   control that mostly re-sorts a small list — a widget, not information.
4. **URL-param shareability (`?project_type=`)** was the one real argument
   FOR a filter. It is preserved at near-zero cost: the API already supports
   it (contract §1) and the sections have stable `id`-less anchors via their
   headings; if Batman later wants shareable deep links, a tiny
   `#internship`-style anchor addition covers it without a UI control.

## What shipped

| Piece | File | Notes |
|---|---|---|
| Page (RSC) | `src/app/projects/page.tsx` | `force-dynamic`; server-fetches via typed client `getProjects({limit:100})`; catch → error surface |
| QueryProvider | `src/components/QueryProvider.tsx` | mounted in root layout (client cache for future interactive surfaces) |
| Card | `src/components/projects/ProjectCard.tsx` | image-first 16/10 lazy `<img>`, overline + display title + 2-line clamp, hover = border→ink + title underline only |
| Sections | `src/components/projects/project-sections.ts` | fixed order, scope copy (42 Paris fact, Qynapse), featured-leads sort, empty sections omitted |
| Section header | `src/components/projects/ProjectSectionHeader.tsx` | title-2 + scope + mono count |
| Error surface | `src/components/projects/ProjectsError.tsx` | what happened + Try again (router.refresh) + API detail line |
| Tests | `__tests__/unit/app/ProjectsPage.test.tsx` (7) + `__tests__/unit/components/ProjectCard.test.tsx` (15) | 22 new |

### Token discipline
Zero raw hex in JSX; every color/size is a token utility (`bg-canvas`,
`text-ink`, `border-line`, `text-muted`, `bg-accent` amber rule only, display
face via `var(--font-display)`). The one amber rule (§1) sits under the
page title; type never changes color (§2.5.3).

### Overline decision (per the task's "CHECK the card type")
`ProjectCard` (§3.1) has `project_type` but **no company field** — company
lives only on `ExperienceRef` in the detail payload. Per the task
instruction ("if absent, overline = type word only"), card overlines are the
bare type words: `School` / `Internship` / `Personal`. The company context
("School · 42 Paris", "Internship · Qynapse") is carried by the **section
headers**, where it is structurally true.

### Images (Batman's first-class rule)
- Every card leads with its thumbnail in a **reserved 16/10 aspect box** →
  zero CLS; `loading="lazy" decoding="async" object-cover`.
- Plain `<img>` (not next/image): thumbnails are absolute URLs from the
  serializer (R2 media domain in prod, `localhost:8000` in dev) — outside
  the Next optimizer allowlist; `remotePatterns` for arbitrary API media
  hosts is a Phase-4 image-pipeline decision (documented in the component).
- Missing thumbnail → quiet "No preview" mono box (data-driven honesty, no
  broken image icon).

## Env wiring (documented)

- Dev: `portfolio_ui_v2/.env.local` (gitignored) with
  `NEXT_PUBLIC_API_URL` / `SERVER_API_URL` / `NEXT_PUBLIC_MEDIA_URL` all
  pointing at the compose dev stack (`localhost:8000`). In-file comments
  explain the url-security localhost-pin quirk and why MEDIA_URL is
  parity-only today: **the serializer sends absolute thumbnail URLs**
  (`build_absolute_uri`), so v2 does no media-host rewriting.
- Prod thumbnails verified on R2 custom domain: all 12 exist
  (`media.aouichou.me/projects/…` — 200 `image/*` with browser UA; plain
  python UA gets 403 from the CDN, a probe artifact, not a data issue).

## Evidence

**Gates** (`npm run test:ci` in `portfolio_ui_v2`):
```
> lint … clean
> tsc --noEmit … clean
Tests:       151 passed, 151 total      (129 pre-existing + 22 new)
✔ token guard PASSED — 21/21 tokens present; blacklist clean
✓ Compiled successfully … build OK; /projects = ƒ (Dynamic)
```

**Live smoke** (dev compose backend on :8000, `next dev` :3100):
```
GET /projects → 200, 61,353 bytes
sections: ['Internship — Qynapse', 'School — 42 Paris', 'Personal']
imgs: 12 | lazy: 12 | detail links: 12 (all real slugs)
42 Paris: True | 1337 anywhere: False
hover:scale present: False | gradients/glow/blur: False
```
Card order (featured lead within sections, API order after):
Clinical Analytics Platform, Keycloak Integration Library, Patient Monitoring
Module | ft_transcendence, miniRT, minishell, FDF, ft_irc, Minitalk,
Philosophers, Push Swap | Mistral Realms.

Thumbnail serving after dev-media sync (4 files existed only in slug
subfolders or R2): **12/12 → 200 `image/*`**.

**API-down smoke** (dead API on :9999 → :3101): renders the designed
surface — overline "Work index failed to load", display headline "The
projects list didn't arrive", amber rule, retry button, mono detail line.
(Live smoke caught a real bug here: the first cut passed the axios error
object across the RSC boundary → "Functions cannot be passed directly to
Client Components". Fixed by normalizing to a plain `detail` string at the
page; unit + live re-verified.)

## Self-critique vs the blacklist (§6)

- `from-purple|…|violet` in src: **0**
- `backdrop-blur|animate-glow|animate-blob|blur-3xl|mix-blend-multiply|bg-clip-text|text-transparent`: **0 real hits** (one match = the blacklist doc comment in globals.css)
- `hover:scale`: **0** (hover is border-color + underline only)
- emoji-as-UI: **0**
- banned vocabulary: **0**
- raw hex in JSX: **0** (tokens only)
- fonts: no new families

Residual honest notes:
1. **Card hover underlines the title via `group-hover:`** — group-hover
   underline is common but not blacklisted; the underline is `accent`, the
   system's sanctioned interactive state (§4.3 "links underline with
   accent").
2. **`line-clamp-2`** hides most of the 235-char descriptions. Intentional:
   the index is a ledger; the description is a scent trail to the detail
   page. If Batman wants two-line full-width rows instead of 3-col image
   cards, it's a one-class change.
3. **Dev media volume was missing 4 thumbnails at DB paths** (files lived
   in slug subfolders / only on R2). Synced locally for the smoke; flagged
   as dev-env debt, not a page bug — prod (R2) serves all 12.

## Tests added (what they pin)

- thumbnail: src + alt + lazy + reserved 16/10 box; null → "No preview"
- type distinction visible: overline words; fixed section order internship
  → school → personal; scope notes; 42 Paris / Qynapse facts; never "1337"
- all 12 render; featured leads within section; every project still present
- link → `/projects/{slug}`; title/description render; 2-line clamp class
- API-down: headline + Try again + detail line
- empty ledger: inviting empty state, no cards
