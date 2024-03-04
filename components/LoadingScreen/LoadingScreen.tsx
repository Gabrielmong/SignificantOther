import { Spinner, StatusBar, View } from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';

export const LoadingScreen = () => {
  const { colorMode } = useAppTheme();
  return (
    <View
      $dark-backgroundColor="#121212"
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Spinner />

      <StatusBar backgroundColor={colorMode === 'dark' ? '#000000' : '#F5F5F5'} />
    </View>
  );
};
