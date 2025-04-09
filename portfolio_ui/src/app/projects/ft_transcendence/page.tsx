// portfolio_ui/src/app/projects/ft_transcendence/page.tsx

import { getProjectBySlug } from '@/library/api-client';
import { Metadata } from 'next';
import ClientTranscendenceWrapper from '@/components/ClientTranscendenceWrapper';

// Force dynamic rendering to avoid build-time API failures
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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

// Server Component
export default function Page() {
  return <ClientTranscendenceWrapper />;
}