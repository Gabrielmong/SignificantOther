import { SafeAreaView } from 'react-native-safe-area-context';
import { GluestackUIProvider, StatusBar } from '@gluestack-ui/themed';
import { store } from '../state';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import { EntryCheckerWrapper } from '../components';
import { useAppTheme } from '../hooks/';
import { ThemeProvider } from '../contexts/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppRegistry, Platform, KeyboardAvoidingView } from 'react-native';
import {
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { renderAllWidgets } from '../widgets/renderWidgets';
import { mergeWidgetLastData } from '../services/widgetTask';
// Import location task to register it
import '../services/locationTask';

// Inner component that consumes theme
function AppContent() {
  const { colorMode, theme, gluestackConfig, isLoading } = useAppTheme();

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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
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

async function handleWidgetRefreshMessage(remoteMessage: {
  data?: { [key: string]: string | object };
}) {
  if (remoteMessage.data?.type !== 'widget-refresh') {
    return false;
  }

  // Merge rather than overwrite, so the cached countdown survives a
  // flower/feeling push.
  const data = await mergeWidgetLastData({
    flower: String(remoteMessage.data.flower || ''),
    message: String(remoteMessage.data.message || ''),
    feeling: String(remoteMessage.data.feeling || ''),
    partnerName: String(remoteMessage.data.partnerName || ''),
  });

  await renderAllWidgets(data);

  return true;
}

setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  const handled = await handleWidgetRefreshMessage(remoteMessage);
  if (!handled) {
    console.log('Message handled in the background!', remoteMessage);
  }
});

onMessage(getMessaging(), async (remoteMessage) => {
  const handled = await handleWidgetRefreshMessage(remoteMessage);
  if (!handled) {
    console.log('Message handled in the foreground!', remoteMessage);
  }
});

onNotificationOpenedApp(getMessaging(), async (remoteMessage) => {
  console.log('Notification opened in the foreground!', remoteMessage);
});

AppRegistry.registerComponent('AppLayout', () => AppLayout);
