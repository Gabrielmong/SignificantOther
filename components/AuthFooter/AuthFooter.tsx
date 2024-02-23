import { Box, Text } from '@gluestack-ui/themed';
import { APP_VERSION } from '../../constants';

export const AuthFooter = () => {
  return (
    <Box
      style={{
        width: '100%',
        gap: 20,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text
        style={{
          fontSize: 12,
          color: 'grey',
        }}>
        Significant Other version {APP_VERSION}
      </Text>
    </Box>
  );
};
