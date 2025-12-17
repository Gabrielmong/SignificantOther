import { Box, Text } from '@gluestack-ui/themed';
import { APP_VERSION } from '../../constants';
import { useAppTheme } from '../../hooks';

export const AuthFooter = () => {
  const { theme } = useAppTheme();

  return (
    <Box
      style={{
        width: '100%',
        gap: theme.spacing[5],
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text
        style={{
          fontSize: theme.fontSize.xs,
          color: theme.colors.textTertiary,
        }}>
        Significant Other version {APP_VERSION}
      </Text>
    </Box>
  );
};
