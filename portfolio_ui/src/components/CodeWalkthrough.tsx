// src/components/CodeWalkthrough.tsx

'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/context/ThemeContext';

interface Step {
  title: string;
  description: string;
  code: string;
  language: string;
  focus?: { start: number; end: number };
}

interface CodeWalkthroughProps {
  projectTitle: string;
  steps: Step[];
}

export default function CodeWalkthrough({ projectTitle, steps }: CodeWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { theme } = useTheme(); // Get current theme
  const step = steps[currentStep];
  
  // Choose syntax highlighting theme based on app theme
  const codeStyle = theme === 'dark' ? vscDarkPlus : vs;
  
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-lg">
      <div className="bg-gray-100 dark:bg-gray-800 p-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {projectTitle}: Code Sample {currentStep + 1}/{steps.length}
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="bg-blue-600 text-white px-3 py-1 rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
            {currentStep + 1} / {steps.length}
          </span>
          <button 
            onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
            disabled={currentStep === steps.length - 1}
            className="bg-blue-600 text-white px-3 py-1 rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 border-t border-gray-200 dark:border-gray-800">
        <div className="p-6 border-r border-gray-200 dark:border-gray-800">
          <h4 className="font-bold text-xl mb-4 text-blue-600 dark:text-blue-400">{step.title}</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{step.description}</p>
          <div className="text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded border border-gray-200 dark:border-gray-700">
            <span className="font-semibold">Language:</span> {step.language.toUpperCase()}
          </div>
        </div>
        <div className="max-h-[500px] overflow-auto">
          <SyntaxHighlighter 
            language={step.language} 
            style={codeStyle}
            wrapLines={true}
            showLineNumbers={true}
            lineProps={lineNumber => {
              const style: React.CSSProperties = { display: 'block' };
              if (
                step.focus && 
                lineNumber >= step.focus.start && 
                lineNumber <= step.focus.end
              ) {
                style.backgroundColor = 'rgba(255, 255, 0, 0.15)';
              }
              return { style };
            }}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              height: '100%',
              minHeight: '500px',
              width: '100%'
            }}
          >
            {step.code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}