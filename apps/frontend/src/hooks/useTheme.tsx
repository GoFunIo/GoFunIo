import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-full hover:bg-bg-section transition-colors"
      aria-label="Przełącz motyw"
    >
      {isDark ? (
        <Sun size={20} strokeWidth={2} className="text-content-primary" />
      ) : (
        <Moon size={20} strokeWidth={2} className="text-content-primary" />
      )}
    </button>
  );
};
