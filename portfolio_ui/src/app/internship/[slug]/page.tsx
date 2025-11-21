// app/internship/[slug]/page.tsx

import InternshipProjectDetail from '@/components/internship/InternshipProjectDetail';
import { fetchInternshipProject } from '@/library/internship-api';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const project = await fetchInternshipProject('qynapse-healthcare', slug);
    
    return {
      title: `${project.title} | Healthcare Technology Internship`,
      description: project.description,
      keywords: [project.title, 'internship project', ...project.tech_stack]
    };
  } catch {
    return {
      title: 'Project Not Found',
      description: 'Internship project not found'
    };
  }
}

export async function generateStaticParams() {
  return []; // Empty array for dynamic SSR
}

export default async function InternshipProjectPage({ params }: Props) {
  const { slug } = await params;
  
  try {
    const project = await fetchInternshipProject('qynapse-healthcare', slug);
    
    if (!project) {
      notFound();
    }
    
    return <InternshipProjectDetail project={project} />;
  } catch {
    notFound();
  }
}
