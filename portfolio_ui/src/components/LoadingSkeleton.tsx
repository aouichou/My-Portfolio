// portfolio_ui/src/components/LoadingSkeleton.tsx

export default function LoadingSkeleton({ count = 3 }) {
	return (
	  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
		{[...Array(count)].map((_, i) => (
		  <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl h-96">
			<div className="h-48 bg-gray-300 dark:bg-gray-600 rounded-t-xl" />
			<div className="p-6 space-y-4">
			  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
			  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
			</div>
		  </div>
		))}
	  </div>
	);
  }