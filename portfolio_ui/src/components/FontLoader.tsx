// portfolio_ui/src/components/FontLoader.tsx

'use client';

import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export default function FontLoader() {
  return (
    <>
      <link rel="preload" href="/fonts/MesloLGS_NF_Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      <style jsx global>{`
        :root {
          --font-inter: ${inter.style.fontFamily};
        }
        
        @font-face {
          font-family: 'MesloLGS NF';
          src: url('/fonts/MesloLGS_NF_Regular.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `}</style>
    </>
  );
}