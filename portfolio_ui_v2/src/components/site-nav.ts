/**
 * SITE_NAV — the single source of truth for the shell's primary routes.
 *
 * Brief §5: plain verbs, sentence case, same name everywhere (the terminal's
 * `open`/`contact` commands and the footer reuse these labels verbatim).
 * Work → /projects is the §5 "name a technology only when it disambiguates"
 * voice: the site IS the work; "Work" carries it. Order is deliberate:
 * work-as-hero (§1), then experience, then the person, then the door out.
 */

export interface SiteNavItem {
  href: string;
  label: string;
}

export const SITE_NAV: readonly SiteNavItem[] = [
  { href: '/projects', label: 'Work' },
  { href: '/experience', label: 'Experience' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

/** The single human behind the site (brief §5 nameplate voice). */
export const SITE_OWNER = 'Amine Aouichou';

/**
 * The single public contact address (F3-12). Same action, same name
 * everywhere (brief §5.5): the /contact mailto fallback, the footer
 * pointer, and the future terminal `contact` command all render THIS
 * value — one source, zero drift. Source: CV contact line.
 */
export const SITE_EMAIL = 'a.ouichou@gmail.com';
