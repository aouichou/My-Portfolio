// src/components/CodeWalkthrough.tsx

'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  const step = steps[currentStep];
  
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-800 p-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {projectTitle}: Code Walkthrough
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="bg-blue-600 text-white px-3 py-1 rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm">
            {currentStep + 1} / {steps.length}
          </span>
          <button 
            onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
            disabled={currentStep === steps.length - 1}
            className="bg-blue-600 text-white px-3 py-1 rounded-md disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 border-t border-gray-200 dark:border-gray-800">
        <div className="p-4 border-r border-gray-200 dark:border-gray-800 overflow-auto">
          <h4 className="font-semibold text-xl mb-2">{step.title}</h4>
          <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
        </div>
        <div className="overflow-auto max-h-[500px]">
          <SyntaxHighlighter 
            language={step.language} 
            style={vscDarkPlus}
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