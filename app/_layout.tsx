import { GluestackUIProvider, StatusBar } from '@gluestack-ui/themed';
import { getMessaging, onMessage, onNotificationOpenedApp } from '@react-native-firebase/messaging';
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppRegistry, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { EntryCheckerWrapper } from '../components';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useAppTheme } from '../hooks/';
import { useChatNotificationTaps } from '../services/chatNotifications';
import { handlePushMessage } from '../services/pushMessages';
import { store } from '../state';
// Import location task to register it
import '../services/locationTask';

// Inner component that consumes theme
function AppContent() {
  const { colorMode, theme, gluestackConfig, isLoading } = useAppTheme();
  useChatNotificationTaps();

  // On Android edge-to-edge, KeyboardAvoidingView computes its padding from the
  // keyboardDidHide event too, and that event's screenY sits above the nav bar,
  // so a nav-bar-sized padding is left behind. Only enable it while the keyboard is up.
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  useEffect(() => {
    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true)),
      Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false)),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  // Wait for the cached theme so a non-default accent never flashes purple
  if (isLoading) return null;

  return (
    <GluestackUIProvider config={gluestackConfig} colorMode={colorMode}>
      <GestureHandlerRootView
        style={{
          flex: 1,
        }}>
        {/* Bottom inset is applied by the tab and auth layouts so the tab bar can sit low */}
        <SafeAreaView
          edges={['top', 'left', 'right']}
          style={{
            flex: 1,
            backgroundColor: theme.colors.background,
          }}>
          <StatusBar backgroundColor={theme.colors.background} />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            // 'height' on Android keeps the shrunk height after the keyboard closes
            behavior="padding"
            enabled={Platform.OS === 'ios' || keyboardVisible}>
            <EntryCheckerWrapper>
              <Slot />
            </EntryCheckerWrapper>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </GestureHandlerRootView>
    </GluestackUIProvider>
  );
}

export default function AppLayout() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
}

// The background handler is registered in services/pushMessages.ts (required
// from index.js), since this route module doesn't load in headless launches.
onMessage(getMessaging(), async (remoteMessage) => {
  const handled = await handlePushMessage(remoteMessage);
  if (!handled) {
    console.log('Message handled in the foreground!', remoteMessage);
  }
});

onNotificationOpenedApp(getMessaging(), async (remoteMessage) => {
  console.log('Notification opened in the foreground!', remoteMessage);
});

AppRegistry.registerComponent('AppLayout', () => AppLayout);
