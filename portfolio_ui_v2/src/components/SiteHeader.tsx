/**
 * SiteHeader — the shell's top chrome (F3-07).
 *
 * Wordmark left (Inter Display semibold — the nameplate voice, §2.2), nav
 * right: Work / Experience / About / Contact — plain verbs, sentence case
 * (brief §5.1). Current route = amber underline + aria-current; no pills,
 * no badges (§2.3 pill ban). Desktop links underline-on-hover only (§4.3).
 *
 * Sticky: NO. Brief §1 restraint — the page is a precise instrument, not an
 * app console; a shadowed bar pinned over 96–128px section beats would be
 * chrome spending budget the signature (live terminal) owns (§3, "one
 * signature per screen"). The header scrolls away like paper.
 *
 * Mobile (brief §1): a quiet disclosure — the wordmark stays, nav collapses
 * behind a plain two-state "Menu" button (text = state, no hamburger icon,
 * no morph flourish). Keyboard: the panel focus-traps, Escape closes, focus
 * returns to the toggle. Route change closes the panel. The only motion is
 * the §4.3 hover-color timing (dur-fast × --motion-scale).
 */

'use client';

import { SITE_NAV } from '@/components/site-nav';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/** True when `href` is the current route (exact, or a child of it). */
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();

  // Route change closes the disclosure — DERIVED, not effected: the panel is
  // open only on the pathname it was opened on (React "adjust state when a
  // prop changes" pattern; no setState-in-effect cascade).
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath !== null && openPath === pathname;

  const toggleMenu = useCallback(() => {
    setOpenPath((current) => (current === pathname ? null : pathname));
  }, [pathname]);

  const navRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Escape closes; focus returns to the toggle (WAI disclosure pattern).
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && menuOpen) {
      setOpenPath(null);
      toggleRef.current?.focus();
    }
  }, [menuOpen]);

  // Simple focus containment while open: Tab wraps inside the nav panel.
  useEffect(() => {
    if (!menuOpen) return;
    document.addEventListener('keydown', onKeyDown);

    const nav = navRef.current;
    if (nav) {
      const focusables = nav.querySelectorAll<HTMLElement>('a[href], button');
      const onTab = (event: KeyboardEvent) => {
        if (event.key !== 'Tab' || focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      nav.addEventListener('keydown', onTab);
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        nav.removeEventListener('keydown', onTab);
      };
    }
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, onKeyDown]);

  return (
    <header className="border-b border-line bg-canvas">
      {/* px-6/px-10 = brief §2.3 gutters (24 mobile / 40 desktop) */}
      <div className="mx-auto flex h-16 max-w-[var(--container)] items-center justify-between px-6 md:px-10">
        <Link
          href="/"
          className="text-title-3 font-semibold tracking-[-0.005em] text-ink transition-colors"
          style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
        >
          Amine Aouichou
        </Link>

        {/* Desktop nav — quiet links; amber underline marks the current route */}
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {SITE_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'text-body font-medium text-ink',
                  'decoration-accent decoration-2 underline-offset-[6px]',
                  'transition-colors duration-fast ease-standard',
                  'hover:underline',
                  active ? 'underline' : 'no-underline',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile disclosure — text-state button, no icon flourish */}
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-nav-mobile"
          onClick={toggleMenu}
          className="text-body font-medium text-ink md:hidden"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Mobile panel — static DOM, visibility by attribute only (a11y-testable) */}
      <nav
        ref={navRef}
        id="site-nav-mobile"
        aria-label="Main"
        data-open={menuOpen}
        hidden={!menuOpen}
        className="border-t border-line md:hidden"
      >
        <ul className="mx-auto max-w-[var(--container)] px-6 py-3">
          {SITE_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="border-b border-line last:border-b-0">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center justify-between py-3 text-body font-medium text-ink',
                    'underline-offset-[6px] decoration-accent decoration-2',
                    active ? 'underline' : 'no-underline',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
