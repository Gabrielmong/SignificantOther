import { Spinner, StatusBar, View } from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';

export const LoadingScreen = () => {
  const { theme } = useAppTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      }}>
      <Spinner color={theme.colors.primary} size="large" />

      <StatusBar backgroundColor={theme.colors.background} />
    </View>
  );
};
