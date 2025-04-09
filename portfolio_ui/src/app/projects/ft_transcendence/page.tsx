// portfolio_ui/src/app/projects/ft_transcendence/page.tsx

import { getProjectBySlug } from '@/library/api-client';
import { TranscendenceProject } from '@/components/TranscendenceProject';
import { Metadata } from 'next';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import  TranscendenceFallback  from '@/components/TranscendenceFallback';

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

export default async function Page() {
	return (
		<ErrorBoundary fallback={<TranscendenceFallback />}>
			<TranscendenceProject />
		</ErrorBoundary>
	);
}