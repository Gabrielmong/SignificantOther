import { Slot, useLocalSearchParams, useSegments, AllRoutes } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAppSelector } from '../../state';
import { router } from 'expo-router';
import { useAuth } from '../../hooks';

export const EntryCheckerWrapper = ({ children }: { children: React.ReactNode }) => {
  const isLogged = useAppSelector((state) => state.user.loggedIn);
  const { initialize } = useAuth();
  const segments = useSegments();
  const [currentRoute, setCurrentRoute] = useState<AllRoutes | null>(null);

  initialize();

  useEffect(() => {
    if (segments) {
      setCurrentRoute(('/' + segments.join('/')) as AllRoutes);
    }
  }, [segments]);

  useEffect(() => {
    if (isLogged === undefined) {
      return;
    }

    if (isLogged) {
      if (currentRoute === '/' || currentRoute === null) {
        router.replace('/(tabs)/Home');
      } else if (currentRoute) {
        router.replace(currentRoute);
      }
    } else {
      router.replace('/Auth/Signin');
    }
  }, [isLogged]);

  return <>{children}</>;
};
