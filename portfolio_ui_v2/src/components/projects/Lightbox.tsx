/**
 * Lightbox — the plates' fullscreen viewer (F3-09a).
 *
 * The ONE sanctioned big-motion moment on the detail page: a single
 * opacity fade on entrance, nothing else — no zoom, no slide, no springs
 * (brief §4/§6). The fade's duration routes through --motion-scale, so
 * prefers-reduced-motion (dial → 0) makes the overlay simply appear.
 *
 * Keyboard contract (pinned by tests):
 * - ArrowLeft / ArrowRight step through the WHOLE page's plate sequence
 *   (flattened across galleries by GalleryPlates), clamped at the ends
 * - Escape closes
 * - Tab / Shift+Tab stay trapped inside the dialog
 * - Focus restores to the plate button that opened it
 *
 * Paper, not void: the overlay is `canvas` with hairline structure — the
 * same tokens as the page, so the image reads as printed on the site's
 * own paper rather than floating in a black hole.
 */

'use client';

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

/** One printable image in the page's flattened plate sequence. */
export interface LightboxItem {
  image_url: string;
  caption: string;
  /** 1-based plate number within the page — the printed-plate reference. */
  plateNumber: number;
  galleryName: string;
}

export interface LightboxProps {
  /** The whole page's plate sequence, in reading order. */
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/** Quiet text-verb action — same shape as the page's meta links. */
const ACTION_CLASS =
  'text-body font-medium text-ink underline-offset-[6px] decoration-accent decoration-2 hover:underline disabled:pointer-events-none disabled:opacity-40';

export default function Lightbox({ items, index, onClose, onNavigate }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  const item = items[index];
  const atStart = index <= 0;
  const atEnd = index >= items.length - 1;

  // The one motion: fade in on the next frame. Under --motion-scale: 0 the
  // transition duration computes to 0ms — instant, per brief §4.1.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Focus in + lock scroll on open; restore focus to the trigger on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, []);

  if (!item) return null;

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowRight' && !atEnd) {
      event.preventDefault();
      onNavigate(index + 1);
      return;
    }
    if (event.key === 'ArrowLeft' && !atStart) {
      event.preventDefault();
      onNavigate(index - 1);
      return;
    }
    if (event.key === 'Tab') {
      // Trap: cycle the dialog's own enabled actions (close / previous /
      // next). Disabled verbs are skipped — native Tab skips them too, so
      // the wrap points must match what the browser can actually reach.
      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (first && last) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

  function handleStageClick(event: ReactMouseEvent<HTMLDivElement>) {
    // Clicking the paper around the image closes; the image itself does not.
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={`fixed inset-0 z-50 flex flex-col bg-canvas outline-none transition-opacity duration-slow ease-out ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-baseline justify-between gap-4 px-6 py-4 md:px-10">
        <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
          Plate {item.plateNumber} — {item.galleryName}
        </p>
        <button type="button" onClick={onClose} className={ACTION_CLASS}>
          Close
        </button>
      </div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center px-6 md:px-10"
        onClick={handleStageClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>: gallery media arrives as absolute cross-origin URLs (R2/API media domain), outside the Next optimizer's allowlist; same precedent as ProjectCard (F3-08). */}
        <img
          src={item.image_url}
          alt={item.caption}
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-baseline sm:justify-between md:px-10">
        <p className="text-body text-muted" aria-live="polite">
          {item.caption}
        </p>
        <div className="flex shrink-0 items-baseline gap-6">
          <span className="font-mono text-mono-sm text-muted" aria-live="polite">
            {index + 1} / {items.length}
          </span>
          <button
            type="button"
            disabled={atStart}
            onClick={() => onNavigate(index - 1)}
            className={ACTION_CLASS}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={atEnd}
            onClick={() => onNavigate(index + 1)}
            className={ACTION_CLASS}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
