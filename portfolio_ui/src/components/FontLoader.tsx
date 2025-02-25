'use client';

import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export default function FontLoader() {
  return (
    <style jsx global>{`
      :root {
        --font-inter: ${inter.style.fontFamily};
      }
    `}</style>
  );
}