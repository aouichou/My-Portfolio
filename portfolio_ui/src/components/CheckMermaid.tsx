// portfolio_ui/src/components/CheckMermaid.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

export default function CheckMermaid() {
  const [status, setStatus] = useState('Checking mermaid status...');
  const [testDiagramStatus, setTestDiagramStatus] = useState('Not rendered yet');
  const testContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check mermaid status
    const mermaidInfo = {
		version: (mermaid as any).version || 'unknown',
      initialized: Boolean(mermaid.parse),
    };

    setStatus(`Mermaid Version: ${mermaidInfo.version}, Initialized: ${mermaidInfo.initialized}`);

    // Try to render a simple test diagram
    const renderTestDiagram = async () => {
      if (!testContainerRef.current) return;
      
      const testId = 'test-mermaid-diagram';
      testContainerRef.current.innerHTML = '';
      
      const testDiv = document.createElement('div');
      testDiv.className = 'mermaid';
      testDiv.id = testId;
      testDiv.textContent = 'graph TD\nA[Test] --> B[Works]';
      
      testContainerRef.current.appendChild(testDiv);
      
      try {
        await mermaid.run({
          querySelector: `#${testId}`
        });
        setTestDiagramStatus('✅ Test diagram rendered successfully');
      } catch (error) {
        setTestDiagramStatus(`❌ Error rendering test diagram: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    void setTimeout(() => void renderTestDiagram(), 500);
  }, []);

  return (
    <div className="fixed bottom-0 right-0 m-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-lg mb-2">Mermaid Debug Info</h3>
      <p className="mb-2">{status}</p>
      <p className="mb-4">{testDiagramStatus}</p>
      
      <h4 className="font-semibold mb-1">Test Diagram:</h4>
      <div 
        ref={testContainerRef} 
        className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
      >
        Loading test diagram...
      </div>
      
      <button 
        onClick={() => { void window.renderMermaidDiagrams?.(); }}
        className="mt-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Force Render All Diagrams
      </button>
    </div>
  );
}