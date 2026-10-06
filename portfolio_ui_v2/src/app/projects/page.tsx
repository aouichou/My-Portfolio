/**
 * /projects — Work index (F3-07 scaffold; content is F3-08).
 *
 * The §2.5 structure (three sections: internship → school → personal,
 * mono overline ledger labels) lands with real data in F3-08+. This frame
 * states that truth so Batman can see where the work will live.
 */

import PageShell from '@/components/PageShell';
import RoutePlaceholder from '@/components/RoutePlaceholder';

export default function ProjectsPage() {
  return (
    <PageShell>
      <RoutePlaceholder
      overline="Route /projects"
      title="Work"
      note="Every shipped project, grouped as it was earned: internships, school work, and things built for myself. Each entry opens onto what it does and how it runs."
      />
    </PageShell>
  );
}
