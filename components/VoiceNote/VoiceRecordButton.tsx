import { Mic } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { springConfig } from '../../config/theme/animations';
import { useAppTheme } from '../../hooks/useAppTheme';
import { selectionFeedback } from '../../utils/haptics';

// Drag this far left while holding to throw the recording away
const CANCEL_AT = 80;

interface VoiceRecordButtonProps {
  recording: boolean;
  onStart: () => void;
  onFinish: (cancel: boolean) => void;
  // Whether letting go now would cancel, for the recording bar's hint
  onCancelArmedChange: (armed: boolean) => void;
}

/** Hold to record, release to send, slide left to cancel */
export const VoiceRecordButton = ({
  recording,
  onStart,
  onFinish,
  onCancelArmedChange,
}: VoiceRecordButtonProps) => {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const armedRef = useRef(false);
  const scale = useSharedValue(1);

  // Grows under the finger while recording, so it's clear it's listening
  useEffect(() => {
    const target = recording ? 1.25 : 1;
    scale.value = reduceMotion ? target : withSpring(target, springConfig.bouncy);
  }, [recording, reduceMotion, scale]);

  const setArmed = (armed: boolean) => {
    if (armed === armedRef.current) return;
    armedRef.current = armed;
    onCancelArmedChange(armed);
    if (armed) selectionFeedback();
  };

  // Runs on the JS thread: every callback here starts or stops native recording
  const hold = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      setArmed(false);
      onStart();
    })
    .onUpdate((event) => setArmed(event.translationX < -CANCEL_AT))
    .onFinalize(() => {
      const cancel = armedRef.current;
      setArmed(false);
      onFinish(cancel);
    });

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <GestureDetector gesture={hold}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel="Hold to record a voice note"
        style={[
          {
            width: 40,
            height: 40,
            borderRadius: theme.radii.xl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: recording ? theme.colors.error : theme.colors.primary,
          },
          style,
        ]}>
        <Mic size={22} color={theme.colors.white} />
      </Animated.View>
    </GestureDetector>
  );
};
