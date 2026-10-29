import { Text } from '@gluestack-ui/themed';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { formatDuration } from './VoiceNotePlayer';
import { useAppTheme } from '../../hooks/useAppTheme';

interface VoiceRecordingBarProps {
  elapsedMs: number;
  cancelArmed: boolean;
}

/** Stands in for the text input while a voice note records */
export const VoiceRecordingBar = ({ elapsedMs, cancelArmed }: VoiceRecordingBarProps) => {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const dotOpacity = useSharedValue(1);

  // A slow pulse on the dot, the usual "recording" cue
  useEffect(() => {
    if (reduceMotion) return;
    dotOpacity.value = withRepeat(withTiming(0.25, { duration: 700 }), -1, true);
    return () => cancelAnimation(dotOpacity);
  }, [reduceMotion, dotOpacity]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flex: 1,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[2],
        paddingHorizontal: theme.spacing[3],
        borderRadius: theme.radii.xl,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: cancelArmed ? theme.colors.error : theme.colors.border,
      }}>
      <Animated.View
        style={[
          { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.error },
          dotStyle,
        ]}
      />
      <Text style={{ color: theme.colors.text, fontSize: theme.fontSize.md, minWidth: 40 }}>
        {formatDuration(elapsedMs)}
      </Text>
      <View
        style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
        {!cancelArmed && <ChevronLeft size={16} color={theme.colors.textSecondary} />}
        <Text
          style={{
            fontSize: theme.fontSize.sm,
            color: cancelArmed ? theme.colors.error : theme.colors.textSecondary,
          }}>
          {cancelArmed ? 'Release to cancel' : 'Slide to cancel'}
        </Text>
      </View>
    </View>
  );
};
