import { SafeAreaView } from 'react-native-safe-area-context';
import { GluestackUIProvider, StatusBar } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { store } from '../state';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import { EntryCheckerWrapper } from '../components';
import { useMemo } from 'react';
import { useAppTheme } from '../hooks/';

export default function AppLayout() {
  const { colorMode } = useAppTheme();

  return (
    <Provider store={store}>
      <GluestackUIProvider config={config} colorMode={'dark'}>
        <SafeAreaView
          style={{
            flex: 1,
          }}>
          <StatusBar backgroundColor={colorMode === 'dark' ? '#121212' : '#F5F5F5'} />
          <EntryCheckerWrapper>
            <Slot />
          </EntryCheckerWrapper>
        </SafeAreaView>
      </GluestackUIProvider>
    </Provider>
  );
}