import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { Icon } from '@gluestack-ui/themed';
import { CircleUserRound, Home } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function HomeLayout() {
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
