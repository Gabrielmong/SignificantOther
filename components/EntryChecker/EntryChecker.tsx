import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { useAppSelector } from '../../state';
import { router } from 'expo-router';
import { useAuth } from '../../hooks';

export const EntryCheckerWrapper = ({ children }: { children: React.ReactNode }) => {
  const isLogged = useAppSelector((state) => state.user.loggedIn);
  const { initialize } = useAuth();

  initialize();

  useEffect(() => {
    console.log('isLogged', isLogged);
    if (isLogged === undefined) {
      return;
    }

    if (isLogged) {
      router.navigate('/(tabs)/Home');
    } else {
      console.log('navigate to /Auth');
      router.navigate('/Auth');
    }
  }, [isLogged]);

  return <>{children}</>;
};
