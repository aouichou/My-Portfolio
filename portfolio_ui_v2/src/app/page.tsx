/**
 * Placeholder page — F3-06a pipeline proof, nothing more.
 *
 * The ONLY purpose: render one heading + one amber accent rule using token
 * utilities exclusively (bg-canvas / text-ink / border-accent), proving the
 * §7.1 @theme inline mechanism produces real CSS. Page building is slice 2
 * (F3-06b). No gradients, no glow, no blur — the quiet chassis.
 */
export default function Home() {
  return (
    <main
      id="main"
      className="min-h-screen bg-canvas px-6 py-24 text-ink font-sans"
    >
      <h1 className="max-w-[66ch] text-display-lg font-semibold tracking-[-0.025em] leading-[1.05]">
        Amine Aouichou
      </h1>
      <p className="mt-6 max-w-[66ch] text-body-lg text-muted">
        Token pipeline proof — F3-06a scaffold. The amber rule below is
        rendered entirely from brief tokens.
      </p>
      {/* The one amber accent rule — brief §1: type, paper, and one amber line */}
      <div className="mt-12 h-px w-24 border-accent bg-accent" aria-hidden="true" />
    </main>
  );
}
