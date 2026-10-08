/**
 * /contact — the conversion surface (F3-12).
 *
 * Audience north star: recruiters and freelance clients. Every line exists
 * to get the right message written and sent. The page keeps the shared
 * editorial rhythm (overline → display h1 → amber rule → lede), then the
 * FORM is the signature: three big quiet fields, mono labels in the
 * facts-ledger grammar, one ink-filled verb button (brief §1/§3 — one
 * signature per screen; no second flourish on this page).
 *
 * Honesty contract (F2 tail): SMTP is graceful server-side — 201 means
 * persisted + email dispatched in background. Copy says exactly that:
 * "saved on the server and on its way to my inbox" — no delivery
 * guarantee, no underselling.
 *
 * Alternative line: the direct address as a plain `Email me` mailto —
 * same verb as the footer (§5.5: same action, same name everywhere).
 *
 * ⚠ BATMAN-PERSONALIZE (F3-17): the lede + response expectation lines —
 * tone draft, he should edit in place.
 */

import ContactForm from '@/components/contact/ContactForm';
import PageShell from '@/components/PageShell';
import { SITE_EMAIL, SITE_OWNER } from '@/components/site-nav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — My-Portfolio',
  description: `Write to ${SITE_OWNER}: recruiters, clients, and collaborators. Three fields, a direct reply to your inbox.`,
};

/**
 * ⚠ BATMAN-PERSONALIZE (F3-17): the lede — who should write, plain verbs,
 * zero oversell. Grounded in the audience decision (profile §12).
 */
const LEDE =
  'Worth talking about? Write. Recruiters with a role, clients with a project, collaborators with an idea — three fields below, and I reply from my own inbox.';

export default function ContactPage() {
  return (
    <PageShell>
      <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
        Contact
      </p>
      <h1
        className="mt-4 text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
        style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
      >
        Write to me
      </h1>
      {/* The one amber rule — brief §1 */}
      <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
      <p className="mt-8 max-w-[66ch] text-body-lg text-muted">{LEDE}</p>

      {/* The form — mt-24 lands the 96px section beat (§2.3) */}
      <section aria-label="Contact form" className="mt-24">
        <ContactForm />
      </section>

      {/* The direct line — same verb as the footer (§5.5) */}
      <section aria-label="Direct email" className="mt-24">
        <h2
          className="text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink"
          style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
        >
          Or write directly
        </h2>
        <p className="mt-4 max-w-[66ch] text-body text-muted">
          Prefer your own mail client? The address below reaches the same
          inbox, with no form in the way.
        </p>
        <a
          href={`mailto:${SITE_EMAIL}`}
          className="mt-4 inline-block font-mono text-mono text-ink underline underline-offset-[6px] decoration-accent decoration-2 hover:decoration-ink"
        >
          Email me — {SITE_EMAIL}
        </a>
      </section>
    </PageShell>
  );
}

