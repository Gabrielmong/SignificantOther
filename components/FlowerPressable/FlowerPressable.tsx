import { TouchableOpacity } from 'react-native';
import { FLOWER_MAP } from '../../constants';
import { Box, Text, Image, Spinner } from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';

export const FlowerPressable = ({
  flower,
  flowerMessage,
  onPress,
  loading,
}: {
  flower: string;
  flowerMessage: string;
  onPress: () => void;
  loading: boolean;
}) => {
  const { colorMode } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 10,
        backgroundColor: colorMode === 'dark' ? '#000000' : '#F5F5F5',
        borderRadius: 10,
        width: '100%',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexDirection: 'row',
        gap: 10,
      }}>
      <Box
        style={{
          alignItems: 'flex-start',
          flex: 1,
        }}>
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.5)',
          }}>
          Flowers I wish I could give you
        </Text>

        <Text>{loading ? 'Loading...' : flowerMessage}</Text>
      </Box>
      <Box
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {loading ? (
          <Box
            style={{
              backgroundColor: colorMode === 'dark' ? '#000000' : '#F5F5F5',
              width: 100,
              height: 100,
              borderRadius: 20,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Spinner />
          </Box>
        ) : (
          <Image
            source={FLOWER_MAP[flower] || FLOWER_MAP['daisy']}
            alt="daisy"
            style={{
              width: 100,
              height: 100,
              borderRadius: 20,
            }}
          />
        )}
      </Box>
    </TouchableOpacity>
  );
};
