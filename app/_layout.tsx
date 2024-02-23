import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { store } from '../state';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import { EntryCheckerWrapper } from '../components';
import { useColorScheme } from 'react-native';
import { useMemo } from 'react';

export default function AppLayout() {
  let colorScheme = useColorScheme();

  const colorMode = useMemo(() => {
    if (colorScheme === 'dark') {
      return 'dark';
    } else {
      return 'light';
    }
  }, [colorScheme]);

  console.log('colorMode', colorMode);
  return (
    <Provider store={store}>
      <GluestackUIProvider config={config} colorMode={colorMode}>
        <SafeAreaView
          style={{
            flex: 1,
          }}>
          <EntryCheckerWrapper>
            <Slot />
          </EntryCheckerWrapper>
        </SafeAreaView>
      </GluestackUIProvider>
    </Provider>
  );
}
