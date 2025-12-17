import { Tabs } from 'expo-router';
import { GluestackUIProvider, View } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { Icon } from '@gluestack-ui/themed';
import { CircleUserRound, Home, MessageCircle } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { TAB_HIDDEN_ROUTES } from '../../constants';
import { AnimatedTabIcon } from '../../components';

export default function HomeLayout() {
  const pathname = usePathname();
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    if (TAB_HIDDEN_ROUTES.includes(pathname)) {
      setTabHidden(true);
    } else {
      setTabHidden(false);
    }
  }, [pathname]);

  return (
    <GluestackUIProvider config={config}>
      <Tabs
        screenOptions={{
          tabBarActiveBackgroundColor: '#2D3250',
          tabBarInactiveBackgroundColor: '#2D3250',
          tabBarActiveTintColor: '#F5E8C7',
          tabBarInactiveTintColor: '#7077A1',
          tabBarStyle: {
            borderTopWidth: 0,
            borderRadius: 20,
            backgroundColor: '#2D3250',
            display: tabHidden ? 'none' : 'flex',
            height: 60,
            paddingBottom: 12,
            paddingTop: 10,
            marginBottom: 12,
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
