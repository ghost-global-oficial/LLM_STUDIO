import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import RNFS from 'react-native-fs';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_FILE = `${RNFS.DocumentDirectoryPath}/theme.txt`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(systemColorScheme === 'light' ? 'light' : 'dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const exists = await RNFS.exists(THEME_FILE);
        if (exists) {
          const saved = await RNFS.readFile(THEME_FILE, 'utf8');
          if (saved === 'light' || saved === 'dark') {
            setTheme(saved);
          }
        }
      } catch (e) {
        console.log('Error loading theme', e);
      }
      setLoaded(true);
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (loaded) {
      RNFS.writeFile(THEME_FILE, theme, 'utf8').catch(e =>
        console.log('Error saving theme', e)
      );
    }
  }, [theme, loaded]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
