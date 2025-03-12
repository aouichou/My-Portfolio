// portfolio_ui/src/app/projects/[slug]/page.tsx

import { getProjectBySlug } from '@/library/api-client';
import { Metadata } from 'next';
import { ProjectDetail } from '@/components/ProjectDetail';

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProjectBySlug(params.slug);
  return {
    title: project?.title || 'Project Not Found',
    description: project?.description || '',
  };
}

export async function generateStaticParams() {
  return []; // Empty array for dynamic SSR
}

export default async function Page({ params }: Props) {
  // Pre-fetch for initial render
  const initialProject = await getProjectBySlug(params.slug);
  
  // Pass the slug to the client component
  return <ProjectDetail slug={params.slug} initialProject={initialProject} />;
}