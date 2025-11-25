// components/CodeWindow.tsx

'use client';

import { useTheme } from '@/context/ThemeContext';
// @ts-ignore - react-syntax-highlighter lacks type definitions but works correctly
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

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

interface CodeWindowProps {
  title: string;
  language: string;
  code: string;
}

export const CodeWindow = ({ title, language, code }: CodeWindowProps) => {
  const { theme } = useTheme();
  const customStyle = createCustomStyle(theme === 'dark');
  // Handle empty code
  const codeContent = code || '// No code available';
  
  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="flex-1 text-center text-sm font-mono text-gray-700 dark:text-gray-300">
          {title}
        </span>
      </div>
      <div className="bg-gray-50 dark:bg-gray-950">
        <SyntaxHighlighter
          language={language}
          style={customStyle}
          showLineNumbers={true}
          wrapLines={true}
          wrapLongLines={true}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: 'transparent',
            padding: '1.5rem'
          }}
          lineNumberStyle={{
            opacity: 0.5,
            minWidth: '2.5em'
          }}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};