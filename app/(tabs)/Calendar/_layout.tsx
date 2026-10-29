import { Stack } from 'expo-router';

import { useAppTheme } from '../../../hooks';

export default function CalendarLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        // Every screen draws its own header with a back arrow
        headerShown: false,
        // iOS-style push with a parallax underlay; resolves to the native default on iOS
        animation: 'ios_from_right',
        // Themed scene background so nothing flashes white mid-transition
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
