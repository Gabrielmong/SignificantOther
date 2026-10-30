/**
 * Theme Context
 * Provides theme state and toggle functionality throughout the app
 * Persists color mode and accent theme to AsyncStorage; syncs the accent
 * theme through Firebase so each partner sees the other's pick
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase, onValue, ref, set } from '@react-native-firebase/database';
import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useColorScheme } from 'react-native';

import {
  createTheme,
  createGluestackConfig,
  DEFAULT_ACCENT,
  isAccentId,
  toAccentId,
  type AccentId,
  type Theme,
  type ColorMode,
} from '../config/theme';
import { loadCachedAccents, cacheAccent, cachePartnerAccent } from '../services/accentStorage';
import { useAppSelector } from '../state';
import { syncAccentToWidget } from '../widgets/renderWidgets';

const THEME_STORAGE_KEY = '@SignificantOther:theme';

interface ThemeContextType {
  theme: Theme;
  colorMode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  accentId: AccentId;
  partnerAccentId: AccentId;
  setAccentId: (id: AccentId) => void;
  gluestackConfig: ReturnType<typeof createGluestackConfig>;
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
    defaultMode || (systemColorScheme === 'dark' ? 'dark' : 'light'),
  );
  const [accentId, setAccentIdState] = useState<AccentId>(DEFAULT_ACCENT);
  const [partnerAccentId, setPartnerAccentId] = useState<AccentId>(DEFAULT_ACCENT);
  const [isLoading, setIsLoading] = useState(true);

  const uid = useAppSelector((state) => state.user.uid);
  const partnerId = useAppSelector((state) => state.room.partnerId);
  const previousUid = useRef(uid);

  // Load saved theme preference on mount
  useEffect(() => {
    Promise.all([loadThemePreference(), loadAccentPreference()]).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }
  };

  const loadAccentPreference = async () => {
    const cached = await loadCachedAccents();
    setAccentIdState(cached.accentId);
    setPartnerAccentId(cached.partnerAccentId);
  };

  // Firebase holds the source of truth for my accent; the cache only covers
  // first paint. A missing value keeps the cache so a reinstall never
  // overwrites a real choice with the default.
  useEffect(() => {
    if (!uid) return;

    return onValue(ref(getDatabase(), `users/${uid}/accentTheme`), (snapshot) => {
      const value = snapshot.val();
      if (isAccentId(value)) {
        setAccentIdState(value);
        cacheAccent(value);
      }
    });
  }, [uid]);

  // Listen to the partner's accent so their changes show up live. Keyed on
  // uid too, so logging back in re-attaches after the logout reset.
  useEffect(() => {
    if (!uid || !partnerId) return;

    return onValue(ref(getDatabase(), `users/${partnerId}/accentTheme`), (snapshot) => {
      const value = toAccentId(snapshot.val());
      setPartnerAccentId(value);
      cachePartnerAccent(value);
    });
  }, [uid, partnerId]);

  // Reset to the default on logout. An empty uid on first render is just
  // auth still loading, not a logout.
  useEffect(() => {
    if (previousUid.current && !uid) {
      setAccentIdState(DEFAULT_ACCENT);
      setPartnerAccentId(DEFAULT_ACCENT);
    }
    previousUid.current = uid;
  }, [uid]);

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

  const setAccentId = useCallback(
    (id: AccentId) => {
      setAccentIdState(id);
      cacheAccent(id);

      if (uid) {
        set(ref(getDatabase(), `users/${uid}/accentTheme`), id).catch((error) => {
          console.error('Failed to save accent theme:', error);
        });
      }
    },
    [uid],
  );

  const theme = useMemo(
    () => createTheme(colorMode, accentId, partnerAccentId),
    [colorMode, accentId, partnerAccentId],
  );

  const gluestackConfig = useMemo(() => createGluestackConfig(theme), [theme]);

  // Keep the home-screen widget in the user's accent and color mode. Skipped
  // while logged out so it can't race logout's widget cache clear.
  useEffect(() => {
    if (isLoading || !uid) return;

    const [from, to] = theme.gradients.primary.colors;
    syncAccentToWidget({
      from: from as `#${string}`,
      to: to as `#${string}`,
      text: theme.colors.onPrimary,
    });
  }, [theme, isLoading, uid]);

  const value = useMemo(
    () => ({
      theme,
      colorMode,
      toggleColorMode,
      setColorMode,
      accentId,
      partnerAccentId,
      setAccentId,
      gluestackConfig,
      isLoading,
    }),
    [
      theme,
      colorMode,
      toggleColorMode,
      setColorMode,
      accentId,
      partnerAccentId,
      setAccentId,
      gluestackConfig,
      isLoading,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
