/**
 * /about — F3-07 scaffold; content is F3-08+.
 */

import PageShell from '@/components/PageShell';
import RoutePlaceholder from '@/components/RoutePlaceholder';

export default function AboutPage() {
  return (
    <PageShell>
      <RoutePlaceholder
      overline="Route /about"
      title="About"
      note="The person behind the work: full-stack engineer, terminal-native, building web services and the infrastructure that runs them."
      />
    </PageShell>
  );
}
