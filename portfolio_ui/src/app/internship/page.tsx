// app/internship/page.tsx

import AutoRenderMermaid from '@/components/AutoRenderMermaid';
import ArchitectureDiagram from '@/components/internship/ArchitectureDiagram';
import CodeSamples from '@/components/internship/CodeSamples';
import ImpactMetrics from '@/components/internship/ImpactMetrics';
import InternshipHero from '@/components/internship/InternshipHero';
import InternshipProjects from '@/components/internship/InternshipProjects';
import { fetchInternshipBySlug } from '@/library/internship-api';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Professional Experience | Healthcare Technology Internship',
  description: 'Backend Engineer internship at healthcare technology startup. Architected Zero Trust security, microservices, and enterprise observability for digital healthcare platform.',
  keywords: ['internship', 'backend engineer', 'healthcare technology', 'zero trust', 'microservices', 'fastapi', 'python']
};

export default async function InternshipPage() {
  // Fetch the internship data (slug from fixture: healthcare-technology-startup)
  const internship = await fetchInternshipBySlug('healthcare-technology-startup');
  
  if (!internship) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <InternshipHero
        company={internship.company}
        role={internship.role}
        subtitle={internship.subtitle}
        startDate={internship.start_date}
        endDate={internship.end_date}
        stats={internship.stats}
      />

      {/* Overview Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8 dark:text-white text-center">
              Overview
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {internship.overview.split('\n\n').map((paragraph: string, index: number) => {
                // Split paragraph by lines to process numbered points
                const lines = paragraph.split('\n');
                
                return (
                  <div key={index} className="mb-6">
                    {lines.map((line, lineIndex) => {
                      // Match numbered points like "1. Title:" or "2. Title:"
                      const numberedMatch = line.match(/^(\d+)\.\s+(.+?):\s*(.*)$/);
                      
                      if (numberedMatch) {
                        const [, number, title, content] = numberedMatch;
                        return (
                          <p key={lineIndex} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">
                              {number}. {title}:
                            </span>
                            {content && <span> {content}</span>}
                          </p>
                        );
                      }
                      
                      // Regular line
                      return lineIndex > 0 ? (
                        <p key={lineIndex} className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {line}
                        </p>
                      ) : (
                        <p key={lineIndex} className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      {internship.projects && internship.projects.length > 0 && (
        <InternshipProjects
          projects={internship.projects}
          internshipSlug={internship.slug}
        />
      )}

      {/* Impact Metrics */}
      <ImpactMetrics metrics={internship.impact_metrics} />

      {/* Architecture Section */}
      {internship.architecture_diagram && (
        <ArchitectureDiagram 
          diagram={internship.architecture_diagram}
          title="Zero Trust Architecture"
          description={internship.architecture_description}
        />
      )}

      {/* Code Samples */}
      <CodeSamples samples={internship.code_samples} />

      {/* Technologies Section */}
      {internship.technologies && internship.technologies.length > 0 && (
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl font-bold mb-8 dark:text-white text-center">
                Technologies & Tools
              </h2>
              <div className="flex flex-wrap gap-3 justify-center">
                {internship.technologies.map((tech: string, index: number) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-semibold text-sm hover:scale-110 transition-transform"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Auto-render Mermaid diagrams */}
      <AutoRenderMermaid />
    </main>
  );
}
