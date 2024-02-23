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
    if (isLogged === undefined) {
      return;
    }

    if (isLogged) {
      router.navigate('(tabs)/Home');
    } else {
      router.navigate('Auth');
    }
  }, [isLogged]);

  return <>{children}</>;
};
