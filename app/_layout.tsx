import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { store } from '../state';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import { EntryCheckerWrapper } from '../components';

export default function AppLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Provider store={store}>
      <GluestackUIProvider config={config}>
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
