/**
 * /contact — F3-07 scaffold; content is F3-08+.
 *
 * Brief §5.5: the eventual action here is "Email me" (and the terminal
 * `contact` command reveals the same address — same action, same name).
 */

import PageShell from '@/components/PageShell';
import RoutePlaceholder from '@/components/RoutePlaceholder';

export default function ContactPage() {
  return (
    <PageShell>
      <RoutePlaceholder
      overline="Route /contact"
      title="Contact"
      note="One direct line: email. No forms to fight with — the address is here, and typing contact in the terminal prints it too."
      />
    </PageShell>
  );
}
