import ShowcasePage from '@/components/PortfolioPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio Architecture | My Portfolio',
  description: 'Learn about the cloud architecture, terminal implementation, and DevOps practices used in this portfolio site',
};

export default function Page() {
  return <ShowcasePage />;
}