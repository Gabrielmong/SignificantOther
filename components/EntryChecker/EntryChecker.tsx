import { Slot, useLocalSearchParams, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAppSelector } from '../../state';
import { router } from 'expo-router';
import { useAuth } from '../../hooks';
import { PermissionsAndroid, Alert } from 'react-native';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';

export const EntryCheckerWrapper = ({ children }: { children: React.ReactNode }) => {
  const isLogged = useAppSelector((state) => state.user.loggedIn);
  const { initialize } = useAuth();
  const segments = useSegments();
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);

  // Returns the auth listener's unsubscribe, so route changes don't stack listeners
  useEffect(() => initialize(), [currentRoute]);

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
  }, [isLogged]);

  useEffect(() => {
    const unsubscribe = onMessage(getMessaging(), async (remoteMessage) => {
      console.log(remoteMessage);
    });

    return unsubscribe;
  }, []);

  return <>{children}</>;
};
