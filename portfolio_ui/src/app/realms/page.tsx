import RealmsPage from '@/components/realms/RealmsPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mistral Realms — AI-Powered D&D Platform | Portfolio',
  description: 'Deep dive into Mistral Realms: an AI-powered Dungeons & Dragons platform built with Mistral AI APIs, tool calling, RAG memory, multi-provider fallback, and full observability.',
};

export default function Page() {
  return <RealmsPage />;
}
