import { FLOWER_MAP } from '../../constants';
import { PressableCard } from '../styled';

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
  return (
    <PressableCard
      label="Flowers I wish I could give you"
      content={loading ? 'Loading...' : flowerMessage}
      imageSource={FLOWER_MAP[flower] || FLOWER_MAP['daisy']}
      imageAlt="flower"
      imagePosition="right"
      contentAlign="flex-start"
      loading={loading}
      onPress={onPress}
    />
  );
};
