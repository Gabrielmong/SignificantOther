import { Tabs } from 'expo-router';
import { GluestackUIProvider, View } from '@gluestack-ui/themed';
import { Icon } from '@gluestack-ui/themed';
import {
  CalendarHeart,
  CircleUserRound,
  HeartHandshake,
  Home,
  MessageCircle,
} from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_HIDDEN_ROUTES } from '../../constants';
import { AnimatedTabIcon } from '../../components';
import { useAppTheme, useOnThisDayNotifications } from '../../hooks';

export default function HomeLayout() {
  const pathname = usePathname();
  const { theme, colorMode, gluestackConfig } = useAppTheme();
  useOnThisDayNotifications();
  const [tabHidden, setTabHidden] = useState(false);
  const insets = useSafeAreaInsets();
  // Gesture nav has a small inset the bar can overlap; 3-button nav needs clearing
  const tabBarBottom = insets.bottom > 30 ? insets.bottom + 4 : 22;

  useEffect(() => {
    if (TAB_HIDDEN_ROUTES.includes(pathname)) {
      setTabHidden(true);
    } else {
      setTabHidden(false);
    }
  }, [pathname]);

  return (
    <GluestackUIProvider config={gluestackConfig} colorMode={colorMode}>
      <Tabs
        screenOptions={{
          tabBarActiveBackgroundColor: theme.colors.surface,
          tabBarInactiveBackgroundColor: theme.colors.surface,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textTertiary,
          // Screens without the tab bar still need to clear the system nav
          sceneStyle: { paddingBottom: tabHidden ? insets.bottom : 0 },
          tabBarStyle: {
            borderTopWidth: 0,
            borderRadius: 20,
            backgroundColor: theme.colors.surface,
            display: tabHidden ? 'none' : 'flex',
            height: 60,
            paddingBottom: 12,
            paddingTop: 10,
            marginBottom: tabBarBottom,
            marginHorizontal: 8,
            elevation: 8,
            shadowColor: '#2b2222ff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            overflow: 'hidden',
          },
          tabBarShowLabel: false,
        }}>
        <Tabs.Screen
          name="Home"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 48,
                  height: 40,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <AnimatedTabIcon focused={focused}>
                  <Icon as={Home} color={color} />
                </AnimatedTabIcon>
              </View>
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="Calendar"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 48,
                  height: 40,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <AnimatedTabIcon focused={focused}>
                  <Icon as={CalendarHeart} color={color} />
                </AnimatedTabIcon>
              </View>
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="YouTwo"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 48,
                  height: 40,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <AnimatedTabIcon focused={focused}>
                  <Icon as={HeartHandshake} color={color} />
                </AnimatedTabIcon>
              </View>
            ),
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="Chat"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 48,
                  height: 40,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <AnimatedTabIcon focused={focused}>
                  <Icon as={MessageCircle} color={color} />
                </AnimatedTabIcon>
              </View>
            ),
            headerShown: false,
            tabBarHideOnKeyboard: true,
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 48,
                  height: 40,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <AnimatedTabIcon focused={focused}>
                  <Icon as={CircleUserRound} color={color} />
                </AnimatedTabIcon>
              </View>
            ),
            headerShown: false,
          }}
        />
      </Tabs>
    </GluestackUIProvider>
  );
}
