// components/FeatureCard.tsx
'use client';

export default function FeatureCard({ feature, index }: { feature: string; index: number }) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg font-bold text-primary">#{index + 1}</span>
        <h3 className="text-xl font-semibold dark:text-white">Key Feature</h3>
      </div>
      <p className="text-gray-600 dark:text-gray-300">{feature}</p>
    </div>
  )
}