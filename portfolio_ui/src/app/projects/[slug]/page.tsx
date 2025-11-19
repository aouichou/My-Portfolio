// portfolio_ui/src/app/projects/[slug]/page.tsx

import { ProjectDetail } from '@/components/ProjectDetail';
import { getProjectBySlug } from '@/library/api-client';
import { Metadata } from 'next';

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  return {
    title: project?.title || 'Project Not Found',
    description: project?.description || '',
  };
}

export async function generateStaticParams() {
  return []; // Empty array for dynamic SSR
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  
  // Pre-fetch for initial render
  const initialProject = await getProjectBySlug(slug);
  
  // Pass the slug to the client component
  return <ProjectDetail slug={slug} initialProject={initialProject} />;
}