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
      <Tabs>
        <Tabs.Screen
          name="Home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Icon as={Home} color={color} />,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="Profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Icon as={CircleUserRound} color={color} />,
            headerShown: false,
          }}
        />
      </Tabs>
    </GluestackUIProvider>
  );
}
