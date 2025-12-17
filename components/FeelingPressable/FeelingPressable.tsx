import { FEELINGS_LABELS, FEELINGS_MAP, FEELING_EMOJIS } from '../../constants';
import { PressableCard } from '../styled';

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
  return (
    <PressableCard
      label="How I'm feeling"
      content={
        loading
          ? 'Loading...'
          : `${partnerName} is feeling ${FEELINGS_LABELS[feeling]} ${FEELING_EMOJIS[feeling]}`
      }
      imageSource={FEELINGS_MAP[feeling] || FEELINGS_MAP['neutral']}
      imageAlt="feeling"
      imagePosition="left"
      contentAlign="flex-end"
      loading={loading}
      onPress={onPress}
    />
  );
};
