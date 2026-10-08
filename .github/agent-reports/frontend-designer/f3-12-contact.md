# F3-12 — Contact page: the conversion surface

**Agent**: Frontend Designer · **Date**: 2026-10-08 · **Branch**: `rework/v2`
**Commit**: `feat(ui-v2): contact page — conversion surface with honest states (F3-12)` (not pushed)

## Summary

The `/contact` page is rebuilt from the F3-07 placeholder into the site's
conversion surface for the audience north star (recruiters + freelance
clients). Shared editorial rhythm (overline → display h1 → amber rule →
lede), then the **form is the page's one signature**: three oversized quiet
fields on paper, mono labels in the facts-ledger grammar, one ink-filled
verb button. Below, the direct mailto line under the site verb.

**Contract check (task asked)**: the typed client **already had**
`submitContact` (F3-01, contract §3.6) — verified in
`src/library/api-client.ts` and pinned by its existing contract suite. No
client addition was needed.

### Files

| File | Role |
|---|---|
| `src/app/contact/page.tsx` | Server component: rhythm + lede + form mount + mailto section |
| `src/components/contact/ContactForm.tsx` | Client form: validation, submit lifecycle, all states |
| `src/components/site-nav.ts` | + `SITE_EMAIL` — the single public address source (mailto + future terminal `contact` command + footer all read one value) |
| `__tests__/unit/app/ContactPage.test.tsx` | 5 page-contract tests |
| `__tests__/unit/components/ContactForm.test.tsx` | 15 state-machine tests |

`RoutePlaceholder` is now unused by /contact (still used by other routes —
checked before considering removal).

## The exact copy, per state (Batman reviews words)

### Page frame

- **Overline**: `Contact`
- **h1**: `Write to me`
- **Lede** *(BATMAN-PERSONALIZE marker)*:
  > Worth talking about? Write. Recruiters with a role, clients with a
  > project, collaborators with an idea — three fields below, and I reply
  > from my own inbox.
- **Labels** (mono, quiet): `Name` · `Email` · `Message`
- **Submit**: `Send message`
- **Alternative section**: h2 `Or write directly` —
  > Prefer your own mail client? The address below reaches the same inbox,
  > with no form in the way.
  >
  > Link: `Email me — a.ouichou@gmail.com` (mailto, SITE_EMAIL single
  > source; same verb as the footer)

### Client validation (field-level, server's voice — what's wrong + how to fix)

- Name empty: `Enter your name — it's how the reply will be addressed.`
- Name > 100: `Names max out at 100 characters — shorten this one.`
- Email empty: `Enter your email address — the reply goes there.`
- Email malformed: `That address doesn't look complete — check it reads like name@domain.com.`
- Message empty: `Write a message — one sentence about what you need is enough.`

### Sending

- Button: `Sending…` + `disabled` + `aria-busy`. No double-POST (in-flight
  submits are dropped). Motion = color only, `duration-fast ×
  --motion-scale` (the dial; reduced-motion respected).

### Success (201) — the graceful-SMTP honesty contract

- Heading (positive): `Message sent.`
- Body:
  > It's saved on the server and on its way to my inbox. I read everything
  > and reply to the address you gave.
- Quiet follow-up link: `Write another message`
- Focus moves to the confirmation (the button unmounts); form fields reset
  only via that link. No confetti, no loop, no entrance motion.

### 429 — rate limit (mirrors `{detail}`)

- Heading (negative): `Too many attempts`
- Body: `Five messages a minute is the limit. Wait a moment, then send again — your text is still here.`
- Mono detail line (verbatim server): `Too many requests, please try again later.`
- Inputs preserved; button re-enabled.

### 400 — server field errors

- Rendered **inline under their field**, verbatim from the server (the
  server already speaks plain verbs):
  - `Enter a valid email address`
  - `Disposable email addresses are not allowed`
  - `Domain doesn't appear to be valid`
- Field marked `aria-invalid` + `aria-describedby` → error `<p>`.
- Unmatched 400 keys render as a form-level `rejected` surface (below).

### Network / API down (retryable)

- Heading (negative): `The message didn't send`
- Body: `The API didn't respond. Try again in a moment — your text is still here.`
- Mono detail line: the axios message (`Network Error`, etc.).
- **Inputs are never cleared on failure** — a recruiter's typed message is
  the most valuable text on the site; retry sends it as-is.

## A11y + behavior details

- Every input: `<label htmlFor>` wired (no placeholder attributes at all —
  paper form, no ghost text; test pins zero `[placeholder]`).
- Focus lands on the **first invalid field** on failed validation; editing a
  field clears only its error.
- Error/status feedback is calm + instant (brief §4.5): full opacity, zero
  entrance motion. Success uses `role="status"`, failures `role="alert"`.
- Keyboard: form submits via Enter (native path through the button; textarea
  Enter = newline, as native).
- Payloads are trimmed before POST (`{Enter}`-artifacts never reach the API).

## Gates (evidence)

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm run type-check` | clean |
| `npm run test:unit-ci` | **249/249** (229 existing + 20 new), 22 suites |
| `npm run test:tokens` | 21/21 tokens present; blacklist clean |
| `npm run build` | 7 routes; `/contact` prerendered ○ |

## Live smoke (dev backend)

Docker was down; I started `db/redis/backend`, ran the smokes, **deleted the
6 smoke rows**, and stopped the containers again (state restored).

| Probe | Result |
|---|---|
| `GET /healthz` | 200 |
| Valid POST (recruiter@example.org) | **201** + echo body |
| Malformed email POST | **400** `{"email":["Enter a valid email address"]}` |
| Disposable domain (mailinator) with `VERIFY_EMAIL_DOMAINS=True` (dev default is False — checked settings live; flag override via `docker exec -e`, Django test Client for allowed host) | **400** `{"email":["Disposable email addresses are not allowed"]}` |
| 6 rapid POSTs | 4×201, then **429** `{"detail":"Too many requests, please try again later."}` — matches the UI's mirrored copy verbatim |
| Persistence | 6 rows in `ContactSubmission` verified before cleanup — 201 = persisted (graceful-SMTP contract held) |

## Self-critique vs the AI-marker blacklist (§6)

- No purple/indigo/violet, no gradients, no blobs, no glassmorphism, no
  glow, no clip-text, no emoji icons, no `hover:scale-*` — grep over all new
  files: **0 matches**.
- No per-component keyframes or framer-motion prose — the form uses zero
  motion beyond token hover/focus colors.
- No raw hex in JSX — tokens only (`bg-canvas`, `text-negative`, `border-line`…).
- Banned vocabulary grep (seamless/blazing/journey/…): **0 matches**.
- Radii within 6/10/12 (`rounded-sm` inputs, `rounded-md` cards/button);
  spacing on the 4/8 grid; `--container` + 24/40 gutters via PageShell.
- One signature per screen: the form. The success card and error surfaces
  are quiet `surface` plates with hairline borders — no second flourish.

### Residual notes for Lucius / Batman

1. **`SITE_EMAIL = a.ouichou@gmail.com`** sourced from the CV contact line —
   confirm it's the address the public site should expose (vs a
   `@aouichou.me` address).
2. Dev `VERIFY_EMAIL_DOMAINS=False` means the disposable 400 doesn't fire in
   local dev by default — the UI renders the server's message whenever the
   server chooses to enforce. Prod behavior is env-driven.
3. The lede + response-expectation lines carry BATMAN-PERSONALIZE markers
   (F3-17 batch, same convention as /about).
