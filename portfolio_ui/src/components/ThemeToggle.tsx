// src/components/ThemeToggle.tsx

'use client';

import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:scale-110 transition-transform"
      aria-label="Toggle dark mode"
    >
      {darkMode ? '🌞' : '🌙'}
    </button>
  );
}




// import { useEffect, useState } from 'react';
// import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';

// export default function ThemeToggle() {
//   const [darkMode, setDarkMode] = useState(false);

//   useEffect(() => {
//     const isDark = localStorage.getItem('darkMode') === 'true';
//     setDarkMode(isDark);
//     document.documentElement.classList.toggle('dark', isDark);
//   }, []);

//   const toggleTheme = () => {
//     const newMode = !darkMode;
//     setDarkMode(newMode);
//     localStorage.setItem('darkMode', newMode.toString());
//     document.documentElement.classList.toggle('dark', newMode);
//   };

//   return (
//     <button
//       onClick={toggleTheme}
//       className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:scale-110 transition-transform"
//     >
//       {darkMode ? (
//         <SunIcon className="w-6 h-6 text-yellow-400" />
//       ) : (
//         <MoonIcon className="w-6 h-6 text-gray-600" />
//       )}
//     </button>
//   );
// }
 
//  The  ThemeToggle  component is a simple button that toggles the dark mode. It uses the  localStorage  API to persist the user's preference across sessions. 
//  The  useEffect  hook is used to set the initial state of the dark mode based on the value stored in  localStorage . The  toggleTheme  function is called when the button is clicked, which toggles the dark mode and updates the  localStorage  value. 
//  The button displays a sun icon when the dark mode is enabled and a moon icon when the dark mode is disabled. The button also has a hover effect that scales the button when hovered. 
//  Step 5: Add the ThemeToggle Component to the App 
//  Now that we have created the  ThemeToggle  component, let's add it to the  App  component.

// Open the  App.tsx  file and import the  ThemeToggle  component. Then, add the  ThemeToggle  component to the  App  component.

