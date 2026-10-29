import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { useSegments, router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuth } from '../../hooks';
import { useAppSelector } from '../../state';

export const EntryCheckerWrapper = ({ children }: { children: React.ReactNode }) => {
  const isLogged = useAppSelector((state) => state.user.loggedIn);
  const { initialize } = useAuth();
  const segments = useSegments();
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);

  // One auth listener for the app's lifetime; it already follows sign-in and
  // sign-out. Re-registering it on every route change re-ran the profile reads
  // and the notification permission request on each navigation, which made
  // screens flicker. (initialize is recreated every render, hence no deps.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => initialize(), []);

  useEffect(() => {
    if (segments) {
      setCurrentRoute('/' + segments.join('/'));
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
        router.replace(currentRoute as any); // Type assertion needed for dynamic routes
      }
    } else {
      router.replace('/Auth/Signin');
    }
    // Redirect only when login state changes, not on every route change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogged]);

  useEffect(() => {
    const unsubscribe = onMessage(getMessaging(), async (remoteMessage) => {
      console.log(remoteMessage);
    });

    return unsubscribe;
  }, []);

  return <>{children}</>;
};
