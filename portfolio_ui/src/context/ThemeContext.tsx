// portfolio_ui/src/context/ThemeContext.tsx

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of the context with proper types
export interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => null, // This is a no-op function as default
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<string>('light');
  
  // Load theme from localStorage on mount
  useEffect(() => {
    // Migrate old preference format if needed
    const oldPreference = localStorage.getItem('darkMode');
    if (oldPreference !== null) {
      // Convert from old boolean format to new string format
      const newTheme = oldPreference === 'true' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      localStorage.removeItem('darkMode'); // Clean up old key
      setTheme(newTheme);
      return;
    }
    
    // Check for saved preference or use system preference
    const savedTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    // Apply the theme
    setTheme(savedTheme);
  }, []);
  
  // Update when theme changes
  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme
export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}