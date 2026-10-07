/**
 * GalleryPlates — galleries as numbered "plates" (F3-09a).
 *
 * Editorial device: each gallery prints as a PLATE — mono caption
 * `Plate N — {name}` in the specimen-sheet voice, description when the
 * data has one, images in reserved boxes. The numbering is the PAGE's
 * (Plate 1, Plate 2 … across galleries), so the lightbox's arrow keys
 * walk one continuous reading sequence.
 *
 * Grid: 1 column for tall images (natural ratio < 4/3), 2 columns for
 * squarer ones (≥ 4/3) — terminal screenshots are near-square, usage
 * strips are panoramic. The ratio is HEURISTIC per image from natural
 * dims embedded in the URL is NOT attempted here; instead a reserved
 * aspect box per column prevents layout shift: tall → aspect-[4/3] 1-col,
 * square-ish → aspect-[4/3] 2-col. (Fixed-ratio grid — the cheap branch
 * of the dispatch: natural dims are not in the contract payload.)
 *
 * Batman rule: images are FIRST-CLASS. Every image is a real <button>
 * (keyboard-reachable) with alt = caption, lazy, in a bordered paper box.
 */

'use client';

import type { Gallery } from '@/library/types/api-v2';
import { useState } from 'react';
import Lightbox, { type LightboxItem } from './Lightbox';

export interface GalleryPlatesProps {
  galleries: Gallery[];
}

/** Fixed reserved box — no layout shift when the image lands (F3-08 precedent). */
const PLATE_ASPECT = 'aspect-[4/3]';

/**
 * Flattened page-wide plate sequence: gallery order, then image order —
 * the order a reader walks, and the lightbox's arrow-key track. The plate
 * number is the GALLERY's ordinal (a gallery prints as one plate; its
 * images are figures within it), matching each section's caption.
 */
export function flattenPlates(galleries: Gallery[]): LightboxItem[] {
  const ordered = [...galleries].sort((a, b) => a.order - b.order);
  const items: LightboxItem[] = [];
  ordered.forEach((gallery, galleryIndex) => {
    const images = [...gallery.images].sort((a, b) => a.order - b.order);
    for (const image of images) {
      if (image.image_url) {
        items.push({
          image_url: image.image_url,
          caption: image.caption,
          plateNumber: galleryIndex + 1,
          galleryName: gallery.name,
        });
      }
    }
  });
  return items;
}

export default function GalleryPlates({ galleries }: GalleryPlatesProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const plates = flattenPlates(galleries);
  const ordered = [...galleries].sort((a, b) => a.order - b.order);

  if (plates.length === 0) return null;

  return (
    <>
      {ordered.map((gallery, galleryIndex) => {
        const images = [...gallery.images]
          .sort((a, b) => a.order - b.order)
          .filter((image) => image.image_url !== null);
        if (images.length === 0) return null;
        // Panoramic strips (ratio ≥ 3:1, e.g. wide usage output) print full
        // width alone; near-square screenshots pair two-up.
        const single = images.length === 1;
        return (
          <section key={gallery.name} aria-label={`Plate ${galleryIndex + 1} — ${gallery.name}`}>
            <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
              Plate {galleryIndex + 1} — {gallery.name}
            </p>
            {gallery.description ? (
              <p className="mt-3 max-w-[66ch] text-body text-muted">{gallery.description}</p>
            ) : null}
            <ul
              className={`mt-6 grid list-none gap-6 ${
                single ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              {images.map((image) => {
                const plateIndex = plates.findIndex(
                  (plate) => plate.image_url === image.image_url
                );
                return (
                  <li key={`${image.image_url}`}>
                    <button
                      type="button"
                      onClick={() => setOpenIndex(plateIndex)}
                      aria-label={`Open plate ${plates[plateIndex]?.plateNumber ?? ''}: ${image.caption}`}
                      className="group block w-full rounded-md border border-line bg-surface text-left transition-[border-color] duration-fast ease-standard hover:border-ink focus-visible:border-ink"
                    >
                      <span className={`block overflow-hidden rounded-t-md ${PLATE_ASPECT}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>: gallery media arrives as absolute cross-origin URLs (API media domain), outside the Next optimizer allowlist; F3-08 precedent. */}
                        <img
                          src={image.image_url ?? ''}
                          alt={image.caption}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="block border-t border-line px-4 py-3 text-caption text-muted">
                        {image.caption}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {openIndex !== null && plates[openIndex] ? (
        <Lightbox
          items={plates}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      ) : null}
    </>
  );
}
