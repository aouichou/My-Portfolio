// src/components/CodeWalkthrough.tsx

'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/context/ThemeContext';

export interface CodeSnippet {
  code: string;
  title: string;
  description: string;
  explanation: string;
  language: string;
}

interface CodeWalkthroughProps {
  projectTitle: string;
  steps: CodeSnippet[];
}

export default function CodeWalkthrough({ projectTitle, steps }: CodeWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { theme } = useTheme();
  
  // Ensure steps is an array with valid items
  const validSteps = Array.isArray(steps) ? steps.filter(s => 
    typeof s === 'object' && s !== null && 'code' in s && typeof s.code === 'string'
  ) as CodeSnippet[] : [];
  
  if (validSteps.length === 0) {
    return <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">No code examples available</div>;
  }
  
  const step = validSteps[currentStep];
  // Choose syntax highlighting theme based on app theme
  const codeStyle = theme === 'dark' ? vscDarkPlus : vs;
  
  // Function to sanitize code by replacing escape sequences
  const sanitizeCode = (code: string): string => {
    return code
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  };
  
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-lg">
      <div className="bg-gray-100 dark:bg-gray-800 p-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">
          {projectTitle}: Code Sample {currentStep + 1}/{validSteps.length}
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
            {currentStep + 1} / {validSteps.length}
          </span>
          <button 
            onClick={() => setCurrentStep(prev => Math.min(validSteps.length - 1, prev + 1))}
            disabled={currentStep === validSteps.length - 1}
            className="bg-blue-600 text-white px-3 py-1 rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 border-t border-gray-200 dark:border-gray-800">
        <div className="p-6 border-r border-gray-200 dark:border-gray-800">
          <h4 className="font-bold text-xl mb-4 text-blue-600 dark:text-blue-400">{step.title}</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{step.description}</p>
          
		{step.explanation && (
		  <div className="mt-6">
			<h5 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">Explanation:</h5>
			<div className="prose dark:prose-invert prose-sm max-w-none explanation-text">
			  {sanitizeCode(step.explanation).split('\n').map((line, i) => {
				// Calculate leading spaces to preserve indentation
				const leadingSpaces = line.match(/^\s*/)?.[0]?.length || 0;
				const indentClass = leadingSpaces > 0 ? `pl-${Math.min(leadingSpaces * 4, 16)}` : '';
				
				return (
				  <p key={i} className={`mb-2 ${indentClass}`} dangerouslySetInnerHTML={{ 
					__html: line.trim()
					  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
					  .replace(/\*([^\*]+)\*/g, '<em>$1</em>') // Italics
					  .replace(/^-\s+(.*)/g, '<li>$1</li>') // List items
				  }} />
				);
			  })}
			</div>
		  </div>
		)}
          
          <div className="mt-6 text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded border border-gray-200 dark:border-gray-700">
            <span className="font-semibold">Language:</span> {step.language.toUpperCase()}
          </div>
        </div>
        
        <div className="max-h-[500px] overflow-auto">
          <SyntaxHighlighter 
            language={step.language} 
            style={codeStyle}
            wrapLines={true}
            showLineNumbers={true}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              height: '100%',
              minHeight: '500px',
              width: '100%'
            }}
          >
            {sanitizeCode(step.code)}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}