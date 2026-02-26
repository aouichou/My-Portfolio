// jest.setup.js
import '@testing-library/jest-dom';

// Mock next/navigation (used by many components)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image with a simple img element
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return require('react').createElement('img', props);
  },
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => {
    return require('react').createElement('a', { href, ...props }, children);
  },
}));

// Silence framer-motion animations in tests
jest.mock('framer-motion', () => {
  const React = require('react');
  const actual = jest.requireActual('framer-motion');
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: (_target, tag) =>
          React.forwardRef(({ children, ...props }, ref) =>
            React.createElement(tag, { ...props, ref }, children)
          ),
      }
    ),
    AnimatePresence: ({ children }) => children,
  };
});

// Stub window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Stub IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};
