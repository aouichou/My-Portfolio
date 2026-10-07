# F3-10 + F3-11 — Experience page + About page

**Agent**: Frontend Designer · **Date**: 2026-10-07 · **Branch**: `rework/v2` (from `22ce99c`)
**Commits**: `feat(ui-v2): experience page — Qynapse story with linked projects (F3-10)` · `feat(ui-v2): about page — recruiter-facing, brief-voice draft copy (F3-11)`

---

## F3-10 `/experience` — the Qynapse story page

### Fetch decision (contract-truth-driven)

The §3.4 list row (`ExperienceListItem`) lacks `overview`, `technologies`,
`impact_metrics`, `duration_months`, and nested `projects` — all body content.
The §3.5 detail (`ExperienceDetail`) carries everything, including the linked
projects **as `ProjectCard`s** (serializer: `ExperienceSerializer.projects =
ProjectCardSerializer(many=True)`). Decision: **list first** (identity + the
contract's `order`), then **one detail fetch per slug** (`Promise.all`). The
page maps 1:1 from list order — the day a second experience ships, a second
story section renders with zero code changes (pinned by a 2-experience test).

### Structure (editorial rhythm = project detail page, deliberately)

```
overline "Experience"
h1  company ("Qynapse")                    — display face
──── amber rule (the one §1 signature)
lede subtitle (served field, body-lg muted)
mono facts row: role · period · N months · N projects   (hairline under)
├─ Overview        — served prose; **bold** markers resolved inline
├─ Facts           — InternshipFacts verbatim (stats/impact/docs rows)
├─ Technologies    — grouped by category in first-seen order
└─ Shipped at Qynapse — ProjectCard grid, featured-first (F3-08 card verbatim)
```

- **Role renders exactly as served**: `Fullstack Engineer intern` (Batman D4;
  pinned by test — never `Software Engineer Intern`).
- **Bold resolution**: the API prose carries `**…**` markers. A 12-line inline
  formatter resolves them to `<strong className="font-medium">` — no markdown
  dependency, no literal `**` in the DOM (pinned by test + live HTML check).
- **Technologies grouping**: live data serves all 26 items `category: null`
  → one quiet flat mono list today; the day categories are authored, each
  group gains its mono label automatically (structure renders from data).
- **Reuse, not re-invention**: `InternshipFacts` (stats/impact/docs) and
  `ProjectCard` are consumed verbatim. The index's featured-first card sort
  was extracted to `sortProjectCards()` in `project-sections.ts` and is now
  shared by both pages — one card order everywhere. `groupProjectsByType`
  behavior unchanged (index tests 100% green).
- **Error/empty**: `ExperienceError` (same §5.6/§4.5 contract as the other
  error surfaces: calm, instant, retry via `router.refresh`, plain-string
  detail across the RSC boundary). Empty list → quiet empty state with a
  "View the work" door to `/projects`.

### Files (F3-10)

- `src/app/experience/page.tsx` — the page (server component, force-dynamic)
- `src/components/experience/ExperienceError.tsx` — API-down surface
- `src/components/projects/project-sections.ts` — `sortProjectCards` extracted
- `__tests__/unit/app/ExperiencePage.test.tsx` — 12 behavioral tests

---

## F3-11 `/about` — recruiter/client-facing

Static server page (no fetch): overline → name h1 → amber rule → lede →
**Facts** (mono `label → value` rows, same voice as InternshipFacts) →
**What I do** (plain-verb list) → **Contact** (the site verb "Email me" →
`/contact`, same name as the footer §5.5).

Blacklist honored (dispatch rules + brief §6): **no photo placeholder, no
skill bars, no years-of-experience counters** — pinned by tests (`img`,
`progress`, `meter` all absent from the DOM; no "years of experience"
wording). Every fact traces to a verifiable source (CV doc, API payload,
site-nav). **42 Paris — never 1337** pinned by test. All copy blocks carry
`⚠ BATMAN-PERSONALIZE (F3-17)` comments for the content pass.

### Files (F3-11)

- `src/app/about/page.tsx` — the page + draft copy (marked for F3-17)
- `__tests__/unit/app/AboutPage.test.tsx` — 8 behavioral tests

---

## The about-copy draft (for Batman's review before F3-17)

> **Lede**
> I build software end to end: the interface, the API behind it, and the
> infrastructure that runs it. I learned engineering at 42 Paris — C, memory,
> concurrency — and spent six months as a Fullstack Engineer intern at
> Qynapse, building HIPAA-compliant healthcare analytics in a Zero Trust stack.
>
> **Facts**
> Name — Amine Aouichou
> Based in — France
> Studying — 42 Paris — Expert in IT Architecture (RNCP Level 7)
> Internship — Qynapse — Fullstack Engineer intern (May–Nov 2025)
>
> **What I do**
> - Systems programming in C and C++ — shells, renderers, concurrency, IPC
> - Fullstack web — Python (Django, FastAPI), TypeScript (Next.js, React), PostgreSQL
> - AI integrations — LLM agents, RAG, embeddings, provider fallbacks
> - Infrastructure — Docker, Kubernetes, CI pipelines, observability
>
> **Contact**
> Recruiting, or have a project in mind? The contact page reaches me
> directly — I read everything. → **Email me**

Grounding: 42 Paris RNCP Level 7 title from `docs/CV_Ledger_QA_Intern.md`;
Qynapse role/period from the live API; What-I-do verbs derived from the
actual project tech stacks (minishell/minirt/philosophers → C systems;
ft_transcendence + Qynapse → fullstack; mistral-realms → AI).

---

## Evidence — gates + live smoke

| Gate | Result |
| --- | --- |
| ESLint (full repo) | clean |
| `tsc --noEmit` | clean |
| Jest (full suite) | **229/229** (209 baseline + 20 new) |
| Token guard (`check-tokens.mjs`) | 21/21, blacklist clean |
| Production build | ✓ — `/about` static, `/experience` dynamic |

Live smoke (dev server :3100, API :8000):

```
about       :3100 -> 200
experience  :3100 -> 200
/           :3100 -> 200
/projects   :3100 -> 200
/projects/minishell -> 200
/contact    :3100 -> 200
```

`/experience` HTML content-verified (17-point script): company h1, role as
served, period, duration, overview bold-resolved, impact+docs rows,
technologies string, "Shipped at Qynapse", 3 preview images, 3 card links,
no 1337, no gradient — ALL PASS.
`/about` HTML content-verified (12-point): name, lede, all fact rows,
4 what-I-do items, contact verb, no img/progress/meter, no years-counter,
no 1337, no gradient/backdrop — ALL PASS.

## Self-critique vs the blacklist (§6)

- **Gradients/glow/blur**: zero — verified in compiled CSS guard + live HTML.
- **AI-default looks** (purple hero, blob, glass): absent — paper + ink +
  one amber rule, same as the approved shell.
- **Decorative excess**: the page borrows the detail page's rhythm verbatim;
  its "signature" is the mono facts row — the same quiet ledger voice
  everywhere, not a new effect.
- **Copy oversell**: about draft states only verifiable facts; superlatives
  in the API overview prose are Qynapse's own marketing of themselves
  ("leading healthcare AI company") — rendered as served, the story page's
  truth contract.

## Notes / handoff

- The `RoutePlaceholder` component is now unused by any route (all F3-07
  scaffolds replaced: projects F3-08, detail F3-09, experience/about here;
  contact + homepage remain). It stays until F3-12/F3-14 consume or replace it.
- Environment note: the backend dev container had stopped mid-session
  (restarted; no data impact). Smoke ran against live :8000 data.
- Pre-existing uncommitted import-order diffs in 11 files (prior session's
  lint fixes) were left untouched — my commits stage only the files listed
  above.
