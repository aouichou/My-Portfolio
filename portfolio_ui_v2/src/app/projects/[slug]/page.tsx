/**
 * /projects/[slug] — project detail (F3-07 scaffold; content is F3-08+).
 *
 * Next 16: params is a Promise — awaited. The real page consumes the frozen
 * api-v2 ProjectDetail contract; here the slug renders in the display face
 * so the route is explorable end-to-end.
 */

import PageShell from '@/components/PageShell';
import RoutePlaceholder from '@/components/RoutePlaceholder';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PageShell>
      <RoutePlaceholder
        overline={`Route /projects/${slug}`}
        title={slug}
        note="One project, end to end: what it does, how it is built, and — where enabled — a real terminal you can type into."
      />
    </PageShell>
  );
}
