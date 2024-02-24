import { Text, View, Button } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '../../../hooks';

export default function Home() {
  const { colorMode } = useAppTheme();
  return (
    <View
      $dark-backgroundColor="#121212"
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text>Stuff will be put here</Text>

      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </View>
  );
}
