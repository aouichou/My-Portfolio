/**
 * InternshipFacts — stats / impact metrics / documentation (F3-09b).
 *
 * The rescued internship-rich content (contract §3.3): quiet mono-labeled
 * stat rows + a doc links list. These are FACTS, not decoration — every
 * row is label + value in the tabular-figures mono voice; no dials, no
 * progress bars, no colored badges (structure encodes truth, quietly).
 *
 * Sections render from data present; all-empty → renders null. The 42
 * Paris / company context is ALREADY carried by the type overline +
 * experience ref in the page header — not duplicated here.
 */

import type { DocRef, ImpactMetric, Stat } from '@/library/types/api-v2';

export interface InternshipFactsProps {
  stats: Stat[];
  impactMetrics: ImpactMetric[];
  documentation: DocRef[];
}

const OVERLINE_CLASS =
  'font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted';

/** One fact row: label (mono, quiet) — value (ink, tabular). */
function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3 last:border-b-0">
      <dt className="min-w-40 font-mono text-mono-sm text-muted">{label}</dt>
      <dd className="text-body text-ink">{value}</dd>
    </div>
  );
}

export default function InternshipFacts({
  stats,
  impactMetrics,
  documentation,
}: InternshipFactsProps) {
  const hasStats = stats.length > 0;
  const hasImpact = impactMetrics.length > 0;
  const hasDocs = documentation.length > 0;
  if (!hasStats && !hasImpact && !hasDocs) return null;

  return (
    <div className="space-y-12">
      {hasStats ? (
        <div>
          <p className={OVERLINE_CLASS}>Facts</p>
          <dl className="mt-4">
            {stats.map((stat) => (
              <FactRow key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </dl>
        </div>
      ) : null}

      {hasImpact ? (
        <div>
          <p className={OVERLINE_CLASS}>Impact</p>
          <dl className="mt-4">
            {impactMetrics.map((metric) => (
              <div
                key={metric.label}
                className="border-b border-line py-3 last:border-b-0"
              >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <dt className="min-w-40 font-mono text-mono-sm text-muted">{metric.label}</dt>
                  <dd className="text-body font-medium text-ink">{metric.value}</dd>
                </div>
                {metric.description ? (
                  <p className="mt-1 max-w-[66ch] text-body text-muted">{metric.description}</p>
                ) : null}
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {hasDocs ? (
        <div>
          <p className={OVERLINE_CLASS}>Documentation</p>
          <ul className="mt-4 list-none space-y-3">
            {documentation.map((doc) => (
              <li key={doc.title} className="flex gap-3 text-body text-ink">
                <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-line" />
                <span>
                  {doc.title}
                  {doc.description ? (
                    <span className="block text-body text-muted">{doc.description}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
