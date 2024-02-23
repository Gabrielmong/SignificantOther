import { StatusBar } from 'expo-status-bar';
import { Text, View, Button } from '@gluestack-ui/themed';
import { useAuth } from '../../../hooks/useAuth';

export default function Home() {
  return (
    <View
      $dark-backgroundColor="#121212"
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
