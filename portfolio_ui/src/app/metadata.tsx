// portfolio_ui/src/app/metadata.tsx

import { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('http://aouichou.me:3000'),
  title: 'Amine Ouichou | Full-Stack Developer Portfolio',
  description: 'Developer specializing in Django and Next.js applications.',
  openGraph: {
    images: '/og-image.jpg',
  },
};