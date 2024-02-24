import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export const useAppTheme = () => {
  let colorScheme = useColorScheme();

  const colorMode = useMemo(() => {
    if (colorScheme === 'dark') {
      return 'dark';
    } else {
      return 'light';
    }
  }, [colorScheme]);

  return {
    colorMode,
  };
};
