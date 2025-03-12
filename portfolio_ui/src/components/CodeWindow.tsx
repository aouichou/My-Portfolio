// components/CodeWindow.tsx

'use client';

import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeWindowProps {
  title: string;
  language: string;
  code: string;
}

export const CodeWindow = ({ title, language, code }: CodeWindowProps) => {
  // Handle empty code
  const codeContent = code || '// No code available';
  
  return (
    <div className="rounded-lg overflow-hidden border bg-[#1e1e1e]">
      <div className="flex items-center px-4 py-2 border-b bg-black/20">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="flex-1 text-center text-sm font-mono text-gray-400">
          {title}
        </span>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: 'transparent',
          padding: '1rem'
        }}
        wrapLongLines
      >
        {codeContent}
      </SyntaxHighlighter>
    </div>
  );
};