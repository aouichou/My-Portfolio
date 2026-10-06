import QueryProvider from '@/components/QueryProvider';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { ThemeProvider } from '@/theme/ThemeContext';
import type { Metadata, Viewport } from 'next';
import { inter, interDisplay, plexMono } from './fonts';
import './globals.css';

/**
 * Root layout — v2 scaffold (F3-06a).
 *
 * Theme boot (brief §7.2): the inline pre-paint script resolves the stored
 * preference (localStorage `theme` — key unchanged) falling back to the
 * system mode, and sets BOTH `.dark` (v1 parity) and `data-mode` (the
 * token-pair hook) plus `color-scheme` before first paint — no flash.
 * Security: the script never touches innerHTML; it only writes the two
 * mode attributes, and nothing from it flows into markup.
 */
export const metadata: Metadata = {
  title: 'My-Portfolio',
  description: 'Amine Aouichou — full-stack engineer. Web services and the infrastructure that runs them.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const themeBootScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var mode = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark');
    root.setAttribute('data-mode', mode);
    root.style.colorScheme = mode;
  } catch (e) {
    /* localStorage unavailable (private mode) — light default already painted */
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={[inter.variable, interDisplay.variable, plexMono.variable].join(' ')}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-screen flex-col bg-canvas font-sans text-ink">
        <ThemeProvider>
          <QueryProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:rounded-md"
            >
              Skip to content
            </a>
            <SiteHeader />
            {children}
            <SiteFooter />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
