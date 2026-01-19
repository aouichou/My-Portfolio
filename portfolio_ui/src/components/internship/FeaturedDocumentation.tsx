// components/internship/FeaturedDocumentation.tsx
'use client';

import { ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

interface DocumentItem {
  title: string;
  description: string;
  category: string;
  icon?: string;
}

interface FeaturedDocumentationProps {
  documents: DocumentItem[];
  totalCount: number;
}

const categoryColors: Record<string, string> = {
  architecture: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  implementation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  security: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  observability: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export default function FeaturedDocumentation({ documents, totalCount }: FeaturedDocumentationProps) {
  // Show only first 4 documents
  const featuredDocs = documents.slice(0, 4);

  return (
    <section className="py-20 bg-linear-to-br from-purple-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Featured Documentation
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
              Comprehensive architecture documents, implementation guides, and security protocols from production systems
            </p>
          </div>

          {/* Documentation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {featuredDocs.map((doc, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-linear-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center text-2xl">
                      {doc.icon || '📄'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {doc.title}
                      </h3>
                      <span className={`shrink-0 px-2 py-1 rounded-md text-xs font-semibold ${categoryColors[doc.category] || categoryColors.architecture}`}>
                        {doc.category}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {doc.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* View All CTA */}
          <div className="text-center">
            <Link
              href="/internship/documentation"
              className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <FileText className="w-5 h-5" />
              View All Documentation ({totalCount})
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
