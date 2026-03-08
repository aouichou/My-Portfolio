// portfolio_ui/src/app/page.tsx

import ContactForm from "../components/ContactForm";
import Hero from "../components/Hero";
import InternshipBanner from "../components/InternshipBanner";
import ProjectsGrid from "../components/ProjectsGrid";
import RealmsBanner from "../components/RealmsBanner";
// import ProjectsDebug from '@/components/ProjectsDebug';
import ArchitectureShowcase from "@/components/ArchitectureShowcase";


export default function Home() {
  return (
    <main className="min-h-screen">
	  {/* <ProjectsDebug /> */}
      <Hero />
      <InternshipBanner />
      <RealmsBanner />
      <ProjectsGrid />
	  <ArchitectureShowcase /> 
	  <ContactForm />
    </main>
  );
}