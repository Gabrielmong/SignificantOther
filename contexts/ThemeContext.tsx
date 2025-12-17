/**
 * Theme Context
 * Provides theme state and toggle functionality throughout the app
 * Persists theme preference to AsyncStorage
 */

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTheme, type Theme, type ColorMode } from '../config/theme';

const THEME_STORAGE_KEY = '@SignificantOther:theme';

interface ThemeContextType {
  theme: Theme;
  colorMode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ColorMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, defaultMode }) => {
  const systemColorScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>(
    defaultMode || (systemColorScheme === 'dark' ? 'dark' : 'light')
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setColorModeState(savedTheme);
      } else if (systemColorScheme) {
        // Use system preference if no saved preference
        setColorModeState(systemColorScheme === 'dark' ? 'dark' : 'light');
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemePreference = async (mode: ColorMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    saveThemePreference(mode);
  }, []);

  const toggleColorMode = useCallback(() => {
    const newMode = colorMode === 'dark' ? 'light' : 'dark';
    setColorMode(newMode);
  }, [colorMode, setColorMode]);

  const theme = useMemo(() => createTheme(colorMode), [colorMode]);

  const value = useMemo(
    () => ({
      theme,
      colorMode,
      toggleColorMode,
      setColorMode,
      isLoading,
    }),
    [theme, colorMode, toggleColorMode, setColorMode, isLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
