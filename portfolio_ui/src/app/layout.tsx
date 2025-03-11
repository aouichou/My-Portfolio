// portfolio_ui/src/app/layout.tsx

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from './ClientLayout';
import { metadata } from './metadata';
import { Toaster } from 'sonner';
import { Inter } from 'next/font/google';
import FontLoader from '@/components/FontLoader';
import BlockCloudflare from '@/components/BlockCloudflare';

const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
	preload: true,
  });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export { metadata };

export default function RootLayout({
	children,
  }: {
	children: React.ReactNode;
  }) {
	return (
	  <html lang="en" suppressHydrationWarning>
		<body className={`${inter.className} ${geistSans.variable} ${geistMono.variable} antialiased`}>
		<BlockCloudflare />
		  <FontLoader />
		  <ClientLayout>
			{children}
			<Toaster position="top-center" />
		  </ClientLayout>
		</body>
	  </html>
	);
  }