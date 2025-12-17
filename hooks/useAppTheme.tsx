import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

/**
 * Hook to access the current theme
 * Provides theme object, colorMode, and toggle function
 */
export const useAppTheme = () => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }

  return context;
};
