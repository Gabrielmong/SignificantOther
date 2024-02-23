import { StatusBar } from 'expo-status-bar';
import { Text, View, Button } from '@gluestack-ui/themed';
import { useAuth } from '../../../hooks/useAuth';

export default function Home() {
  const { logout } = useAuth();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text>Stuff will be put here</Text>

      <StatusBar style="auto" />
    </View>
  );
}
