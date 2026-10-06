/**
 * ProjectSectionHeader — title-2 opener + one-line scope note (F3-08).
 *
 * Brief §2.5: each section opens with title-2 in the display face plus a
 * one-line muted scope note ("what this kind of work is"). The count is a
 * mono ledger figure on the same baseline row — numbers are facts (§5.3),
 * not decoration. One hairline above separates sections quietly.
 */

import type { ProjectSection } from './project-sections';

export default function ProjectSectionHeader({ section }: { section: ProjectSection }) {
  return (
    <div className="border-t border-line pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          className="text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink"
          style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
        >
          {section.title}
        </h2>
        <p className="shrink-0 font-mono text-mono-sm text-muted" aria-hidden="true">
          {section.projects.length}
        </p>
      </div>
      <p className="mt-2 max-w-[66ch] text-body text-muted">{section.scope}</p>
    </div>
  );
}
