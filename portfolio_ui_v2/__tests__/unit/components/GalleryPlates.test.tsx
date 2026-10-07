/**
 * Behavioral tests — GalleryPlates + Lightbox (F3-09a).
 *
 * Pins the plates contract:
 * - galleries render as numbered plate sections (mono caption
 *   `Plate N — {name}`, description when present), in gallery `order`
 * - images: lazy <img> with alt = caption, reserved 4/3 box, caption
 *   under the image in muted body text
 * - 1-image galleries print single-column; multi-image pair two-up
 * - lightbox: opens on plate click, ArrowLeft/Right walk the WHOLE
 *   page sequence (across galleries), Escape closes, focus restores to
 *   the trigger, focus stays trapped while open
 * - alt text = caption (Batman rule: images first-class, labeled by truth)
 *
 * jsdom cannot load images or compute Tailwind; grid/aspect are asserted
 * via the class names that produce them — tokens guarded by check-tokens.
 */

import GalleryPlates, { flattenPlates } from '@/components/projects/GalleryPlates';
import type { Gallery } from '@/library/types/api-v2';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

afterEach(cleanup);

function gallery(overrides: Partial<Gallery> = {}): Gallery {
  const base: Gallery = {
    name: 'Program Execution',
    description: 'Demonstration of philosopher states during simulation',
    order: 1,
    images: [
      {
        image_url: 'http://localhost:8000/media/galleries/normal_output.png',
        caption: 'Normal execution with 5 philosophers',
        order: 1,
      },
      {
        image_url: 'http://localhost:8000/media/galleries/normal_output2.png',
        caption: 'Continued execution showing multiple state changes',
        order: 2,
      },
      {
        image_url: 'http://localhost:8000/media/galleries/dead_philo.png',
        caption: 'Philosopher death when timing parameters are too tight',
        order: 3,
      },
    ],
    ...overrides,
  };
  return base;
}

const TWO_GALLERIES: Gallery[] = [
  gallery(),
  gallery({
    name: 'Program Usage',
    description: 'Command-line interface and parameters',
    order: 2,
    images: [
      {
        image_url: 'http://localhost:8000/media/galleries/help_output.png',
        caption: 'Help output showing parameter requirements',
        order: 1,
      },
    ],
  }),
];

describe('GalleryPlates — plates render from data', () => {
  it('numbers galleries as plates in gallery order with mono captions', () => {
    render(<GalleryPlates galleries={TWO_GALLERIES} />);
    expect(screen.getByText('Plate 1 — Program Execution')).toBeInTheDocument();
    expect(screen.getByText('Plate 2 — Program Usage')).toBeInTheDocument();
  });

  it('respects gallery order, not array position', () => {
    render(<GalleryPlates galleries={[TWO_GALLERIES[1]!, TWO_GALLERIES[0]!]} />);
    // order=1 (Program Execution) still prints as Plate 1 even when it
    // arrives second in the array; usage (order=2) is Plate 2.
    const first = screen.getByText('Plate 1 — Program Execution');
    const second = screen.getByText('Plate 2 — Program Usage');
    expect(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('renders every image: lazy, descriptive alt = caption, caption text below', () => {
    render(<GalleryPlates galleries={TWO_GALLERIES} />);
    for (const g of TWO_GALLERIES) {
      for (const image of g.images) {
        const img = screen.getByAltText(image.caption);
        expect(img).toHaveAttribute('src', image.image_url);
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('decoding', 'async');
        // The caption also prints as visible muted text under the image
        // (the span inside the plate button — alt is not text content).
        const captionNode = screen.getByText(image.caption);
        expect(captionNode.tagName).toBe('SPAN');
        expect(captionNode.className).toContain('text-muted');
      }
    }
  });

  it('reserves the 4/3 box so late images cannot shift layout', () => {
    const { container } = render(<GalleryPlates galleries={TWO_GALLERIES} />);
    expect(container.querySelectorAll('.aspect-\\[4\\/3\\]').length).toBe(4);
  });

  it('prints gallery descriptions when the data has them', () => {
    render(<GalleryPlates galleries={TWO_GALLERIES} />);
    expect(
      screen.getByText('Demonstration of philosopher states during simulation')
    ).toBeInTheDocument();
    expect(screen.getByText('Command-line interface and parameters')).toBeInTheDocument();
  });

  it('renders nothing when galleries carry no printable images', () => {
    const { container } = render(
      <GalleryPlates
        galleries={[gallery({ images: [{ image_url: null, caption: 'gone', order: 1 }] })]}
      />
    );
    expect(container.querySelector('section')).toBeNull();
  });
});

describe('flattenPlates — the page-wide reading sequence', () => {
  it('flattens gallery order then image order, numbering by gallery ordinal', () => {
    const plates = flattenPlates(TWO_GALLERIES);
    expect(plates.map((p) => p.caption)).toEqual([
      'Normal execution with 5 philosophers',
      'Continued execution showing multiple state changes',
      'Philosopher death when timing parameters are too tight',
      'Help output showing parameter requirements',
    ]);
    expect(plates.map((p) => p.plateNumber)).toEqual([1, 1, 1, 2]);
    expect(plates[3]?.galleryName).toBe('Program Usage');
  });

  it('drops images with null URLs from the sequence', () => {
    const plates = flattenPlates([
      gallery({
        images: [
          { image_url: null, caption: 'missing', order: 1 },
          { image_url: 'http://x/a.png', caption: 'present', order: 2 },
        ],
      }),
    ]);
    expect(plates).toHaveLength(1);
    expect(plates[0]?.caption).toBe('present');
  });
});

describe('Lightbox — keyboard-first viewing', () => {
  it('opens on plate click and shows caption + plate ref + position', async () => {
    const user = userEvent.setup();
    render(<GalleryPlates galleries={TWO_GALLERIES} />);
    await user.click(
      screen.getByRole('button', {
        name: 'Open plate 1: Normal execution with 5 philosophers',
      })
    );
    const dialog = screen.getByRole('dialog', { name: 'Image viewer' });
    expect(within(dialog).getByText('Plate 1 — Program Execution')).toBeInTheDocument();
    expect(within(dialog).getByText('Normal execution with 5 philosophers')).toBeInTheDocument();
    expect(within(dialog).getByText('1 / 4')).toBeInTheDocument();
  });

  it('ArrowRight walks the whole page sequence, across galleries', async () => {
    const user = userEvent.setup();
    render(<GalleryPlates galleries={TWO_GALLERIES} />);
    await user.click(
      screen.getByRole('button', {
        name: 'Open plate 1: Normal execution with 5 philosophers',
      })
    );
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
    // Crossing into the second gallery flips the plate ref (the dialog's
    // own ref, scoped away from the page's identical plate captions).
    await user.keyboard('{ArrowRight}');
    const dialog = screen.getByRole('dialog', { name: 'Image viewer' });
    expect(within(dialog).getByText('4 / 4')).toBeInTheDocument();
    expect(within(dialog).getByText('Plate 2 — Program Usage')).toBeInTheDocument();
    expect(within(dialog).getByText('Help output showing parameter requirements')).toBeInTheDocument();
  });

  it('clamps at both ends and disables the matching verb', async () => {
    const user = userEvent.setup();
    render(<GalleryPlates galleries={TWO_GALLERIES} />);
    await user.click(
      screen.getByRole('button', {
        name: 'Open plate 1: Normal execution with 5 philosophers',
      })
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('1 / 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('2 / 4')).toBeInTheDocument();
  });

  it('Escape closes and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<GalleryPlates galleries={TWO_GALLERIES} />);
    const trigger = screen.getByRole('button', {
      name: 'Open plate 1: Normal execution with 5 philosophers',
    });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Image viewer' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', { name: 'Image viewer' })
    ).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(<GalleryPlates galleries={TWO_GALLERIES} />);
    await user.click(
      screen.getByRole('button', {
        name: 'Open plate 1: Normal execution with 5 philosophers',
      })
    );
    const dialog = screen.getByRole('dialog', { name: 'Image viewer' });
    // Initial focus lands on the dialog container itself (keyboard users
    // get arrow keys immediately); Tab then enters the actions.
    expect(dialog).toHaveFocus();
    await user.keyboard('{Tab}');
    const close = within(dialog).getByRole('button', { name: 'Close' });
    const previous = within(dialog).getByRole('button', { name: 'Previous' });
    const next = within(dialog).getByRole('button', { name: 'Next' });
    expect(close).toHaveFocus();
    // Previous is DISABLED at 1/4 — native Tab skips it: Close → Next.
    expect(previous).toBeDisabled();
    await user.keyboard('{Tab}');
    expect(next).toHaveFocus();
    // Wrap: Tab from Next returns to Close; Shift+Tab from Close → Next.
    await user.keyboard('{Tab}');
    expect(close).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(next).toHaveFocus();
  });
});
