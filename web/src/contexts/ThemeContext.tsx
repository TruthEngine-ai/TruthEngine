import React, { createContext, useContext, useState, type ReactNode, useEffect } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const getSystemTheme = (): boolean => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
};

const getStoredTheme = (): boolean | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('truthengine-theme');
    if (stored !== null) {
      return stored === 'dark';
    }
  }
  return null;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const storedTheme = getStoredTheme();
    return storedTheme !== null ? storedTheme : getSystemTheme();
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const newTheme = !prev;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('truthengine-theme', newTheme ? 'dark' : 'light');
      }
      return newTheme;
    });
  };

  useEffect(() => {
    // 应用主题到body元素
    if (typeof document !== 'undefined') {
      document.body.className = isDarkMode ? 'dark' : 'light';
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        const storedTheme = getStoredTheme();
        if (storedTheme === null) {
          setIsDarkMode(e.matches);
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);

        return () => {
          mediaQuery.removeEventListener('change', handleChange);
        };
      }
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
