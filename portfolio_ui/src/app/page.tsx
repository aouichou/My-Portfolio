// portfolio_ui/src/components/page.tsx

import Hero from "../components/Hero";
import ProjectsGrid from "../components/ProjectsGrid";
import ContactForm from "../components/ContactForm";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <ProjectsGrid />
	  <ContactForm />
    </main>
  );
}