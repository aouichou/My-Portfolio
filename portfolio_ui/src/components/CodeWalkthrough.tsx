// src/components/CodeWalkthrough.tsx

'use client';

import { useTheme } from '@/context/ThemeContext';
import { useState } from 'react';
// @ts-ignore - react-syntax-highlighter lacks type definitions but works correctly
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

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

// Custom syntax highlighting colors - gray/blue palette
const createCustomStyle = (isDark: boolean) => ({
  'code[class*="language-"]': {
    color: isDark ? '#d1d5db' : '#374151',
    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
    fontSize: '0.875rem',
    textAlign: 'left' as const,
    whiteSpace: 'pre' as const,
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    lineHeight: '1.5',
    tabSize: 4,
    hyphens: 'none' as const,
  },
  'pre[class*="language-"]': {
    color: isDark ? '#d1d5db' : '#374151',
    padding: '1.5rem',
    margin: '0',
    overflow: 'auto',
  },
  'comment': { color: isDark ? '#6b7280' : '#9ca3af', fontStyle: 'italic' },
  'prolog': { color: isDark ? '#6b7280' : '#9ca3af' },
  'doctype': { color: isDark ? '#6b7280' : '#9ca3af' },
  'cdata': { color: isDark ? '#6b7280' : '#9ca3af' },
  'punctuation': { color: isDark ? '#9ca3af' : '#6b7280' },
  'property': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'tag': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'boolean': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'number': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'constant': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'symbol': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'selector': { color: isDark ? '#a5b4fc' : '#6366f1' },
  'attr-name': { color: isDark ? '#a5b4fc' : '#6366f1' },
  'string': { color: isDark ? '#9ca3af' : '#6b7280' },
  'char': { color: isDark ? '#9ca3af' : '#6b7280' },
  'builtin': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'inserted': { color: isDark ? '#34d399' : '#10b981' },
  'operator': { color: isDark ? '#9ca3af' : '#6b7280' },
  'entity': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'url': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'variable': { color: isDark ? '#d1d5db' : '#374151' },
  'atrule': { color: isDark ? '#a5b4fc' : '#6366f1' },
  'attr-value': { color: isDark ? '#9ca3af' : '#6b7280' },
  'keyword': { color: isDark ? '#60a5fa' : '#2563eb' },
  'function': { color: isDark ? '#93c5fd' : '#3b82f6' },
  'class-name': { color: isDark ? '#a5b4fc' : '#6366f1' },
  'regex': { color: isDark ? '#34d399' : '#10b981' },
  'important': { color: isDark ? '#fbbf24' : '#f59e0b', fontWeight: 'bold' },
  'deleted': { color: isDark ? '#f87171' : '#ef4444' },
});

export default function CodeWalkthrough({ projectTitle, steps }: CodeWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { theme } = useTheme();
  
  // Ensure steps is an array with valid items
  const validSteps = Array.isArray(steps) ? steps.filter(s => 
    s && typeof s === 'object' && 'code' in s && typeof s.code === 'string'
  ) as CodeSnippet[] : [];
  
  if (validSteps.length === 0) {
    return <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">No code examples available</div>;
  }
  
  const step = validSteps[currentStep];
  const customStyle = createCustomStyle(theme === 'dark');
  
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
            onClick={() => { setCurrentStep(prev => Math.max(0, prev - 1)); }}
            disabled={currentStep === 0}
            className="bg-blue-600 text-white px-3 py-1 rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
            {currentStep + 1} / {validSteps.length}
          </span>
          <button 
            onClick={() => { setCurrentStep(prev => Math.min(validSteps.length - 1, prev + 1)); }}
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
				
				// Parse markdown-like formatting safely without dangerouslySetInnerHTML
				const parseLine = (text: string) => {
				  const parts: React.ReactNode[] = [];
				  let remaining = text.trim();
				  let key = 0;
				  
				  // Handle list items
				  const isListItem = remaining.startsWith('- ');
				  if (isListItem) {
					remaining = remaining.slice(2);
				  }
				  
				  // Parse bold and italic
				  while (remaining.length > 0) {
					const boldMatch = remaining.match(/^(.*?)\*\*(.*?)\*\*/);
					const italicMatch = remaining.match(/^(.*?)\*([^\*]+?)\*/);
					
					if (boldMatch && (!italicMatch || boldMatch.index! <= italicMatch.index!)) {
					  if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
					  parts.push(<strong key={key++}>{boldMatch[2]}</strong>);
					  remaining = remaining.slice(boldMatch[0].length);
					} else if (italicMatch) {
					  if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
					  parts.push(<em key={key++}>{italicMatch[2]}</em>);
					  remaining = remaining.slice(italicMatch[0].length);
					} else {
					  parts.push(<span key={key++}>{remaining}</span>);
					  break;
					}
				  }
				  
				  return isListItem ? <li key={i} className={`mb-2 ${indentClass}`}>{parts}</li> : <p key={i} className={`mb-2 ${indentClass}`}>{parts}</p>;
				};
				
				return parseLine(line);
			  })}
			</div>
		  </div>
		)}
          
          <div className="mt-6 text-sm bg-gray-50 dark:bg-gray-800/50 p-3 rounded border border-gray-200 dark:border-gray-700">
            <span className="font-semibold">Language:</span> {step.language.toUpperCase()}
          </div>
        </div>
        
        <div className="max-h-[500px] overflow-auto bg-gray-50 dark:bg-gray-950">
          <SyntaxHighlighter 
            language={step.language} 
            style={customStyle}
            wrapLines={true}
            showLineNumbers={true}
            wrapLongLines={true}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              height: '100%',
              minHeight: '500px',
              width: '100%',
              background: 'transparent'
            }}
            lineNumberStyle={{
              opacity: 0.5,
              minWidth: '2.5em'
            }}
          >
            {sanitizeCode(step.code)}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}