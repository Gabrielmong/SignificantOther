import { TouchableOpacity } from 'react-native';
import { FEELINGS_LABELS, FEELINGS_MAP, FEELING_EMOJIS } from '../../constants';
import { Box, Text, Image, Spinner } from '@gluestack-ui/themed';
import { useAppTheme } from '../../hooks';

export const FeelingPressable = ({
  partnerName,
  feeling,
  onPress,
  loading,
}: {
  partnerName: string;
  feeling: string;
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
            source={FEELINGS_MAP[feeling] || FEELINGS_MAP['neutral']}
            alt="daisy"
            style={{
              width: 100,
              height: 100,
              borderRadius: 20,
            }}
          />
        )}
      </Box>
      <Box
        style={{
          alignItems: 'flex-end',
          flex: 1,
        }}>
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.5)',
          }}>
          How I'm feeling
        </Text>

        <Text>
          {loading
            ? 'Loading...'
            : `${partnerName} is feeling ${FEELINGS_LABELS[feeling]} ${FEELING_EMOJIS[feeling]}`}
        </Text>
      </Box>
    </TouchableOpacity>
  );
};
