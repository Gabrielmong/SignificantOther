import { Slot } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AuthLayout() {
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
      <Slot />
    </SafeAreaView>
  );
}
