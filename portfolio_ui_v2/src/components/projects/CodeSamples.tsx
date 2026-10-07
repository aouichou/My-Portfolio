/**
 * CodeSamples + CodeSteps + DemoMount — the Code section bodies (F3-09b).
 *
 * Three quiet bodies under one roof (they share the code-plate chassis):
 *
 * - CodeSamples: code_snippets as token-skinned highlight.js plates
 *   (amber keywords on surface, ink text — NO default hljs themes),
 *   title + description + language overline, `Copy` text verb per block
 *   with a brief `Copied` moment routed through --motion-scale.
 * - CodeSteps: code_steps as an ordered run list — mono numbers, body
 *   text (the "how to run it" ladder).
 * - DemoMount: has_demo=true → demo_commands as a quiet list + the
 *   bordered mount box reserved for the Phase 4 LiveTerminal embed
 *   (F3-14) — labeled for wiring, NOT a fake terminal. has_demo=false
 *   renders NOTHING (no empty states for absent features).
 *
 * Highlighting is CLIENT + LAZY: highlight.js core imports with the
 * component (small, ~30KB), but language grammars register on mount and
 * the highlight pass runs after — SSR renders plain <pre><code> (valid,
 * readable) so first paint never waits.
 */

'use client';

import type { CodeSnippet, DemoCommand } from '@/library/types/api-v2';
import type { LanguageFn } from 'highlight.js';
import { useEffect, useState } from 'react';

/** The languages our payloads actually carry (philosophers/minishell: c;
 *  ft_transcendence/clinical: javascript + python). Others fall back to
 *  plain text — highlight.js `highlight()` with an unregistered language
 *  throws, so the allowlist IS the safety here. */
const LANGUAGES = ['c', 'javascript', 'python'] as const;

/** Resolve a payload language tag to a registered alias (or null). */
function normalizeLanguage(language?: string): string | null {
  if (!language) return null;
  const tag = language.toLowerCase();
  return (LANGUAGES as readonly string[]).includes(tag) ? tag : null;
}

/** Static import map — Turbopack needs literal specifiers to code-split. */
const GRAMMARS: Record<string, () => Promise<{ default: LanguageFn }>> = {
  c: () => import('highlight.js/lib/languages/c'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  python: () => import('highlight.js/lib/languages/python'),
};

/* ============================================================================
 * CodeSamples
 * ========================================================================== */

interface SnippetPlateProps {
  snippet: CodeSnippet;
  index: number;
}

/** One snippet: overline meta, optional description, highlighted plate. */
function SnippetPlate({ snippet, index }: SnippetPlateProps) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const language = normalizeLanguage(snippet.language);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!language) return;
      try {
        const hljs = (await import('highlight.js/lib/core')).default;
        if (!hljs.getLanguage(language) && GRAMMARS[language]) {
          const grammar = await GRAMMARS[language]?.();
          hljs.registerLanguage(language, grammar.default);
        }
        const result = hljs.highlight(snippet.code, { language, ignoreIllegals: true });
        if (!cancelled) setHighlighted(result.value);
      } catch {
        // Unhighlightable code is still readable code — plain render stays.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language, snippet.code]);

  return (
    <article aria-label={snippet.title ?? `Code snippet ${index + 1}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-title-3 font-semibold text-ink" style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}>
          {snippet.title ?? `Snippet ${index + 1}`}
        </h3>
        <span className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
          {snippet.language ?? 'text'}
        </span>
      </div>
      <div className="mt-2 flex items-start justify-between gap-6">
        {snippet.description ? (
          <p className="max-w-[66ch] text-body text-muted">{snippet.description}</p>
        ) : (
          <span />
        )}
        <CopyVerb code={snippet.code} />
      </div>
      {/* Token-skinned code plate (globals.css §code): surface bg, ink
          text, amber keywords — the ONLY accent; NO hljs default themes. */}
      <div className="hljs-plate mt-4 overflow-x-auto rounded-md border border-line p-4 font-mono text-mono-sm leading-[1.6] md:p-6">
        {highlighted !== null ? (
          <code
            className="hljs"
            // highlight.js output is built from the payload's own code
            // text by hljs.highlight (entity-escaped by the library); no
            // raw payload HTML enters here.
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <code className="hljs">{snippet.code}</code>
        )}
      </div>
    </article>
  );
}

export interface CodeSamplesProps {
  snippets: CodeSnippet[];
}

export function CodeSamples({ snippets }: CodeSamplesProps) {
  if (snippets.length === 0) return null;
  return (
    <div className="space-y-16">
      {snippets.map((snippet, index) => (
        <SnippetPlate key={snippet.title ?? index} snippet={snippet} index={index} />
      ))}
    </div>
  );
}

/* ============================================================================
 * CodeSteps — the run ladder
 * ========================================================================== */

export interface CodeStepsProps {
  steps: string[];
}

export function CodeSteps({ steps }: CodeStepsProps) {
  if (steps.length === 0) return null;
  return (
    <ol className="list-none space-y-3">
      {steps.map((step, index) => (
        <li key={`${index}-${step.slice(0, 24)}`} className="flex gap-4 text-body text-ink">
          <span
            aria-hidden="true"
            className="w-8 shrink-0 pt-[0.15em] text-right font-mono text-mono-sm text-muted"
          >
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="whitespace-pre-line">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/* ============================================================================
 * DemoMount — the Phase 4 terminal entry point
 * ========================================================================== */

export interface DemoMountProps {
  commands: DemoCommand[];
}

export function DemoMount({ commands }: DemoMountProps) {
  if (commands.length === 0) return null;
  return (
    <div>
      <ul className="list-none space-y-3">
        {commands.map((command) => (
          <li key={command.command} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="min-w-16 font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
              {command.label}
            </span>
            <code className="rounded-sm border border-line bg-surface px-3 py-1 font-mono text-mono-sm text-ink">
              {command.command}
            </code>
          </li>
        ))}
      </ul>
      {/* F3-14 / Phase 4 wiring: the LiveTerminal embed mounts here.
          Reserved now as a bordered box so the composition slot is real. */}
      <div
        aria-hidden="true"
        className="mt-8 rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center"
      >
        <p className="font-mono text-mono-sm text-muted">
          Live terminal arrives with the demo system
        </p>
      </div>
    </div>
  );
}

/* ============================================================================
 * Copy verb — exported for reuse; quiet icon-free text (dispatch spec)
 * ========================================================================== */

export function CopyVerb({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setCopied(false), reduced ? 0 : 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
        } catch {
          // Clipboard denied (permissions/iframe): the button simply does
          // nothing — code remains selectable as the fallback path.
        }
      }}
      className="rounded-sm font-mono text-mono-sm font-medium text-muted transition-colors duration-fast ease-standard hover:text-ink focus-visible:text-ink"
      aria-live="polite"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
