// components/GithubContributions.tsx

'use client';

import { useEffect, useState } from 'react';

interface GithubContributionsProps {
  repoUrl: string;
}

export const GithubContributions = ({ repoUrl }: GithubContributionsProps) => {
  const [contributions, setContributions] = useState<number[]>([]);

  useEffect(() => {
    // Fetch GitHub contributions data here
    // This is a mock implementation
    const mockData = Array.from({ length: 365 }, () => 
      Math.floor(Math.random() * 10)
    );
    setContributions(mockData);
  }, [repoUrl]);

  // Simple activity graph without the dependency
  return (
    <div className="rounded-xl border p-6 bg-gray-100 dark:bg-gray-800">
      <p className="mb-4 text-muted-foreground">Repository: <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{repoUrl}</a></p>
      
      <div className="h-32 w-full flex items-end gap-1">
        {contributions.slice(0, 52).map((value, index) => (
          <div 
            key={index}
            className="flex-1 h-full flex flex-col justify-end"
            title={`${value} contributions`}
          >
            <div 
              className="w-full rounded-sm"
              style={{ 
                height: `${Math.max(10, value * 10)}%`,
                backgroundColor: value === 0 ? '#1e1e2e' : 
                  value < 3 ? '#2b4555' : 
                  value < 6 ? '#39658b' : 
                  value < 8 ? '#5294cf' : '#66b3ff'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};