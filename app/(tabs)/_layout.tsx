import { Tabs } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { Icon } from '@gluestack-ui/themed';
import { CircleUserRound, Home, MessageCircle } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { TAB_HIDDEN_ROUTES } from '../../constants';

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
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: '#2D3250',
            display: tabHidden ? 'none' : 'flex',
          },
          tabBarShowLabel: false,
        }}>
        <Tabs.Screen
          name="Home"
          options={{
            tabBarIcon: ({ color, size }) => <Icon as={Home} color={color} />,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="Chat"
          options={{
            tabBarIcon: ({ color, size }) => <Icon as={MessageCircle} color={color} />,
            headerShown: false,
            tabBarHideOnKeyboard: true,
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color, size }) => <Icon as={CircleUserRound} color={color} />,
            headerShown: false,
          }}
        />
      </Tabs>
    </GluestackUIProvider>
  );
}
