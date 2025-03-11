// portfolio_ui/src/app/page.tsx

import Hero from "../components/Hero";
import ProjectsGrid from "../components/ProjectsGrid";
import ContactForm from "../components/ContactForm";
import ProjectsDebug from '@/components/ProjectsDebug';

export default function Home() {
  return (
    <main className="min-h-screen">
	  <ProjectsDebug />
      <Hero />
      <ProjectsGrid />
	  <ContactForm />
    </main>
  );
}