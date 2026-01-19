// components/internship/CodeSamples.tsx
'use client';

import { useTheme } from '@/context/ThemeContext';
// @ts-ignore - react-syntax-highlighter lacks type definitions but works correctly
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

interface CodeSample {
  title: string;
  description: string;
  code: string;
  language: string;
  highlights?: string[];
}

interface CodeSamplesProps {
  samples: CodeSample[];
}

// Custom syntax highlighting colors - gray/blue palette
const createCustomStyle = (isDark: boolean) => ({
  'code[class*="language-"]': {
    color: isDark ? '#d1d5db' : '#374151',
    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
    fontSize: '0.875rem',
    textAlign: 'left' as const,
    whiteSpace: 'pre' as const,
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 4,
    hyphens: 'none' as const,
  },
  'pre[class*="language-"]': {
    color: isDark ? '#d1d5db' : '#374151',
    padding: '1.5rem',
    margin: '0',
    overflow: 'auto',
  },
  'comment': { color: isDark ? '#6b7280' : '#9ca3af', fontStyle: 'italic' },
  'prolog': { color: isDark ? '#6b7280' : '#9ca3af' },
  'doctype': { color: isDark ? '#6b7280' : '#9ca3af' },
  'cdata': { color: isDark ? '#6b7280' : '#9ca3af' },
  'punctuation': { color: isDark ? '#9ca3af' : '#6b7280' },
  'property': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'tag': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'boolean': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'number': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'constant': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'symbol': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'selector': { color: isDark ? '#a5b4fc' : '#6366f1' },
  'attr-name': { color: isDark ? '#a5b4fc' : '#6366f1' },
  'string': { color: isDark ? '#9ca3af' : '#6b7280' },
  'char': { color: isDark ? '#9ca3af' : '#6b7280' },
  'builtin': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'inserted': { color: isDark ? '#34d399' : '#10b981' },
  'operator': { color: isDark ? '#9ca3af' : '#6b7280' },
  'entity': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'url': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'variable': { color: isDark ? '#d1d5db' : '#374151' },
  'atrule': { color: isDark ? '#a5b4fc' : '#6366f1' },
  'attr-value': { color: isDark ? '#9ca3af' : '#6b7280' },
  'keyword': { color: isDark ? '#60a5fa' : '#2563eb' },
  'function': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'class-name': { color: isDark ? '#a5b4fc' : '#6366f1' },
  'regex': { color: isDark ? '#34d399' : '#10b981' },
  'important': { color: isDark ? '#fbbf24' : '#f59e0b', fontWeight: 'bold' },
  'deleted': { color: isDark ? '#f87171' : '#ef4444' },
});

export default function CodeSamples({ samples }: CodeSamplesProps) {
  const { theme } = useTheme();
  const customStyle = createCustomStyle(theme === 'dark');

  if (!samples || samples.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 dark:text-white text-center">
            Code Samples
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 text-center">
            Real patterns and implementations from production code
          </p>
          
          <div className="space-y-8">
            {samples.map((sample, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold dark:text-white">
                      {sample.title}
                    </h3>
                    <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                      {sample.language.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {sample.description}
                  </p>
                </div>
                <div className="overflow-x-auto bg-gray-50 dark:bg-gray-950 rounded-lg">
                  <SyntaxHighlighter 
                    language={sample.language}
                    style={customStyle}
                    showLineNumbers={true}
                    wrapLines={true}
                    wrapLongLines={true}
                    customStyle={{
                      margin: 0,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      padding: '1.5rem',
                      background: 'transparent'
                    }}
                    lineNumberStyle={{
                      opacity: 0.5,
                      minWidth: '2.5em'
                    }}
                  >
                    {sample.code}
                  </SyntaxHighlighter>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
