// components/MermaidComponent.tsx

'use client';

import mermaid from 'mermaid';
import { useCallback, useEffect, useRef, useState } from 'react';

interface MermaidProps {
  chart: string;
  onError?: () => void;
}

let mermaidReady = false;
let renderCounter = 0;

function initMermaid(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
    htmlLabels: true,
    flowchart: {
      curve: 'linear',
      useMaxWidth: false, // Let SVG use natural size for better zoom
      htmlLabels: true,
      nodeSpacing: 50,
      rankSpacing: 50,
      padding: 20,
    },
    sequence: {
      useMaxWidth: false,
      actorMargin: 60,
      messageMargin: 40,
    },
  });
  mermaidReady = true;
}

export const MermaidComponent = ({ chart, onError }: MermaidProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<string>('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  // Detect dark mode
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        // Ensure mermaid is initialized
        if (!mermaidReady) {
          initMermaid(isDark);
        }

        // Process chart: trim leading whitespace from each line
        const processedChart = chart
          .split('\n')
          .map((line) => line.trimStart())
          .join('\n')
          .trim();

        // Generate unique ID
        const id = `mermaid-render-${++renderCounter}`;

        // Use mermaid.render() — returns SVG string, much more reliable
        const { svg } = await mermaid.render(id, processedChart);

        if (cancelled) return;

        svgRef.current = svg;
        setError(null);
        setRendered(true);
        resetView();

        // Inject SVG into container
        if (containerRef.current) {
          const wrapper = containerRef.current.querySelector('.mermaid-svg-wrapper');
          if (wrapper) {
            wrapper.innerHTML = svg;

            // Make SVG responsive within the zoom container
            const svgEl = wrapper.querySelector('svg');
            if (svgEl) {
              svgEl.style.maxWidth = 'none';
              svgEl.style.height = 'auto';
              svgEl.removeAttribute('height');
            }
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        // Extract meaningful error message
        let message = 'Unknown rendering error';
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'object' && err !== null) {
          const errObj = err as Record<string, unknown>;
          if (errObj.str) message = String(errObj.str);
          else if (errObj.message) message = String(errObj.message);
          else {
            const str = JSON.stringify(err);
            if (str !== '{}') message = str;
          }
        } else if (typeof err === 'string') {
          message = err;
        }
        console.error('Mermaid render error:', message);
        setError(message);
        setRendered(false);
        onError?.();
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => void renderDiagram(), 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chart, isDark, onError, resetView]);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.min(Math.max(0.2, s + delta), 4));
    },
    []
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p className="mb-1">Diagram could not be rendered</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Zoom controls */}
      {rendered && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-md border border-gray-200 dark:border-gray-600 p-1">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.25, 4))}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold"
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s - 0.25, 0.2))}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={resetView}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs"
            title="Reset view"
          >
            ⟳
          </button>
          <span className="px-1.5 py-1 text-[10px] text-gray-400 dark:text-gray-500 select-none">
            {Math.round(scale * 100)}%
          </span>
        </div>
      )}

      {/* Diagram viewport */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', minHeight: 120 }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {!rendered && !error && (
          <div className="animate-pulse flex space-x-4 p-6">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            </div>
          </div>
        )}
        <div
          className="mermaid-svg-wrapper transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        />
      </div>

      {/* Hint */}
      {rendered && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Scroll to zoom · Drag to pan
        </p>
      )}
    </div>
  );
};