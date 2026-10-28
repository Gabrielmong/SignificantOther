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
import messaging from '@react-native-firebase/messaging';
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
        <SafeAreaView
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

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  const handled = await handleWidgetRefreshMessage(remoteMessage);
  if (!handled) {
    console.log('Message handled in the background!', remoteMessage);
  }
});

messaging().onMessage(async (remoteMessage) => {
  const handled = await handleWidgetRefreshMessage(remoteMessage);
  if (!handled) {
    console.log('Message handled in the foreground!', remoteMessage);
  }
});

messaging().onNotificationOpenedApp(async (remoteMessage) => {
  console.log('Notification opened in the foreground!', remoteMessage);
});

AppRegistry.registerComponent('AppLayout', () => AppLayout);
