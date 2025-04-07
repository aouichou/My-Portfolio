// portfolio_ui/src/app/projects/ft_transcendence/page.tsx

import { getProjectBySlug } from '@/library/api-client';
import { TranscendenceProject } from '@/components/TranscendenceProject';
import { Metadata } from 'next';

// Force dynamic rendering to avoid build-time API failures
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const project = await getProjectBySlug('ft_transcendence');
    return {
      title: project?.title || 'ft_transcendence - Team Project',
      description: project?.description || 'Real-time Pong game with tournaments and social features',
    };
  } catch (error) {
    // Fallback metadata if API fails
    return {
      title: 'ft_transcendence - Team Project',
      description: 'Real-time Pong game with tournaments and social features',
    };
  }
}

export default async function Page() {
  try {
    // If API fails, we'll gracefully handle it in the component
    const initialProject = await getProjectBySlug('ft_transcendence');
    return <TranscendenceProject initialProject={initialProject} />;
  } catch (error) {
    // Pass null as initialProject, component will handle this case
    return <TranscendenceProject initialProject={null} />;
  }
}