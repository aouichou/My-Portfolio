// portfolio_ui/src/app/projects/ft_transcendence/page.tsx

import { TranscendenceProject } from '@/components/TranscendenceProject';
import { getProjectBySlug } from '@/library/api-client';

// Force dynamic rendering to avoid build-time API calls
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const project = await getProjectBySlug('ft_transcendence');
  return {
    title: project?.title || 'ft_transcendence - Team Project',
    description: project?.description || 'Real-time Pong game with tournaments and social features',
  };
}

export default async function Page() {
  const initialProject = await getProjectBySlug('ft_transcendence');
  return <TranscendenceProject initialProject={initialProject} />;
}