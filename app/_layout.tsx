import { SafeAreaView } from 'react-native-safe-area-context';
import { GluestackUIProvider, StatusBar } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { store } from '../state';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import { EntryCheckerWrapper } from '../components';
import { useAppTheme } from '../hooks/';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppRegistry, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

export default function AppLayout() {
  const { colorMode } = useAppTheme();

  return (
    <Provider store={store}>
      <GluestackUIProvider config={config} colorMode={'dark'}>
        <GestureHandlerRootView
          style={{
            flex: 1,
          }}>
          <SafeAreaView
            style={{
              flex: 1,
            }}>
            <StatusBar backgroundColor={colorMode === 'dark' ? '#121212' : '#F5F5F5'} />
            <EntryCheckerWrapper>
              <Slot />
            </EntryCheckerWrapper>
          </SafeAreaView>
        </GestureHandlerRootView>
      </GluestackUIProvider>
    </Provider>
  );
}

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Message handled in the background!', remoteMessage);
});

messaging().onMessage(async (remoteMessage) => {
  console.log('Message handled in the foreground!', remoteMessage);
});

messaging().onNotificationOpenedApp(async (remoteMessage) => {
  console.log('Notification opened in the foreground!', remoteMessage);
});

AppRegistry.registerComponent('AppLayout', () => AppLayout);
