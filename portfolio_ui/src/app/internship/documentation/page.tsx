// app/internship/documentation/page.tsx
'use client';

import { useTheme } from '@/context/ThemeContext';
import { getInternshipBySlug } from '@/library/internship-api';
import type { InternshipCodeSample, InternshipDocumentation } from '@/library/internship-types';
import { Code, FileText, Filter } from 'lucide-react';
import { useEffect, useState } from 'react';
// @ts-ignore - react-syntax-highlighter lacks type definitions but works correctly
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

const categoryColors: Record<string, string> = {
  architecture: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  implementation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  security: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  observability: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

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

export default function DocumentationPage() {
  const { theme } = useTheme();
  const customStyle = createCustomStyle(theme === 'dark');
  const [activeTab, setActiveTab] = useState<'documents' | 'code'>('documents');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [documents, setDocuments] = useState<InternshipDocumentation[]>([]);
  const [codeSamples, setCodeSamples] = useState<InternshipCodeSample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch internship data
    const fetchData = async () => {
      try {
        const data = await getInternshipBySlug('qynapse-healthcare');
        setDocuments(data.documentation || []);
        setCodeSamples(data.code_samples || []);
      } catch (error) {
        console.error('Error fetching documentation:', error);
        setDocuments([]);
        setCodeSamples([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter documents by category
  const filteredDocuments = selectedCategory === 'all' 
    ? documents 
    : documents.filter(doc => doc.category === selectedCategory);

  // Get unique categories from documents
  const categories = ['all', ...Array.from(new Set(documents.map(doc => doc.category).filter(Boolean)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <section className="py-20 bg-linear-to-br from-purple-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Documentation & Code Samples
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300">
              Comprehensive architecture documents, implementation guides, security protocols, and production code patterns
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto flex justify-center gap-4">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'documents'
                  ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FileText className="w-5 h-5" />
              Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === 'code'
                  ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Code className="w-5 h-5" />
              Code Samples ({codeSamples.length})
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'documents' && (
              <>
                {/* Category Filters */}
                <div className="mb-8 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
                    <Filter className="w-5 h-5" />
                    Filter:
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => category && setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all capitalize ${
                          selectedCategory === category
                            ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Documents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredDocuments.map((doc, index) => (
                    <div
                      key={index}
                      className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="shrink-0">
                          <div className="w-12 h-12 rounded-lg bg-linear-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center text-2xl">
                            📄
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {doc.title}
                            </h3>
                            {doc.category && (
                              <span className={`shrink-0 px-2 py-1 rounded-md text-xs font-semibold capitalize ${categoryColors[doc.category] || categoryColors.architecture}`}>
                                {doc.category}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            {doc.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredDocuments.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      No documents found in this category.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'code' && (
              <div className="space-y-8">
                {codeSamples.map((sample, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {sample.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {sample.description}
                        </p>
                      </div>
                      <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                        {sample.language?.toUpperCase() || 'CODE'}
                      </span>
                    </div>
                    <div className="overflow-x-auto bg-gray-50 dark:bg-gray-950 rounded-lg">
                      <SyntaxHighlighter 
                        language={sample.language || 'text'}
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

                {codeSamples.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      No code samples available.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
