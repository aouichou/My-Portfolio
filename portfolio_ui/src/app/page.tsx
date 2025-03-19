// portfolio_ui/src/app/page.tsx

import Hero from "../components/Hero";
import ProjectsGrid from "../components/ProjectsGrid";
import ContactForm from "../components/ContactForm";
import ProjectsDebug from '@/components/ProjectsDebug';
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
	  <ProjectsDebug />
      <Hero />
	<section className="container mx-auto px-4 py-8 mb-8">
	  <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 shadow-lg border border-purple-100 dark:border-purple-800/30">
		<div className="flex flex-col md:flex-row items-center">
		  <div className="mr-6 mb-4 md:mb-0">
			<div className="bg-purple-100 dark:bg-purple-800/50 p-4 rounded-full">
			  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
			  </svg>
			</div>
		  </div>
		  <div className="flex-1">
			<h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 mb-1">Portfolio Architecture Deep Dive</h3>
			<p className="text-gray-600 dark:text-gray-300 mb-4">
			  Curious how this site works behind the scenes? Explore the cloud-native architecture, terminal implementation, and DevOps practices.
			</p>
			<Link href="/showcase" 
			  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
			  Explore Architecture
			  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
				<path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
			  </svg>
			</Link>
		  </div>
		</div>
	  </div>
	</section>
      <ProjectsGrid />
	  <ContactForm />
    </main>
  );
}