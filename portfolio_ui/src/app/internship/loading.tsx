// app/internship/loading.tsx

export default function InternshipLoading() {
  return (
    <main className="min-h-screen">
      {/* Hero Skeleton */}
      <div className="py-16 bg-linear-to-r from-blue-900 via-purple-900 to-blue-900 animate-pulse">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="h-12 bg-blue-800/50 rounded w-3/4 mx-auto mb-6" />
            <div className="h-6 bg-blue-800/50 rounded w-1/2 mx-auto mb-8" />
            <div className="flex gap-4 justify-center mb-8">
              <div className="h-10 w-32 bg-blue-800/50 rounded" />
              <div className="h-10 w-32 bg-blue-800/50 rounded" />
            </div>
            <div className="flex gap-6 justify-center">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-8 w-20 bg-blue-800/50 rounded mb-2" />
                  <div className="h-4 w-16 bg-blue-800/50 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4" />
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-4/5" />
          </div>
        </div>
      </div>

      {/* Projects Grid Skeleton */}
      <div className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mx-auto mb-12 animate-pulse" />
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-300 dark:bg-gray-700 rounded-xl h-96" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
