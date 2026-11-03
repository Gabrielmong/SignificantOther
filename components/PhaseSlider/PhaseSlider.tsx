import { Box, Text } from '@gluestack-ui/themed';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useAppTheme } from '../../hooks';
import { selectionFeedback } from '../../utils/haptics';
import { PHASE_COUNT } from '../../utils/moon';

const THUMB = 28;
const TRACK = 6;
// Labels under the new moon, quarters and full moon
const MARKS = [
  { index: 0, emoji: '🌑' },
  { index: 7, emoji: '🌓' },
  { index: 14, emoji: '🌕' },
  { index: 21, emoji: '🌗' },
];

/** Picks one of the 28 moon phases; snaps to each step with a haptic tick */
export const PhaseSlider = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (index: number) => void;
}) => {
  const { theme } = useAppTheme();
  const [width, setWidth] = useState(0);
  const step = width > 0 ? (width - THUMB) / (PHASE_COUNT - 1) : 0;

  const x = useSharedValue(0);
  const current = useSharedValue(value);
  const dragging = useSharedValue(false);

  // Follow the value from outside (e.g. the modal reopening) unless mid-drag
  useEffect(() => {
    if (dragging.value) return;
    current.value = value;
    x.value = withSpring(value * step, { damping: 20, stiffness: 220 });
  }, [value, step, current, x, dragging]);

  const indexAt = (px: number) => {
    'worklet';
    if (step <= 0) return 0;
    return Math.max(0, Math.min(PHASE_COUNT - 1, Math.round((px - THUMB / 2) / step)));
  };

  const moveTo = (px: number) => {
    'worklet';
    const i = indexAt(px);
    x.value = Math.max(0, Math.min(width - THUMB, px - THUMB / 2));
    if (i !== current.value) {
      current.value = i;
      runOnJS(onChange)(i);
      runOnJS(selectionFeedback)();
    }
  };

  const settle = () => {
    'worklet';
    x.value = withSpring(current.value * step, { damping: 20, stiffness: 220 });
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      dragging.value = true;
      moveTo(e.x);
    })
    .onUpdate((e) => moveTo(e.x))
    .onFinalize(() => {
      dragging.value = false;
      settle();
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB / 2 }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <Box
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Moon phase"
      accessibilityValue={{ min: 1, max: PHASE_COUNT, now: value + 1 }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const delta = e.nativeEvent.actionName === 'increment' ? 1 : -1;
        onChange((value + delta + PHASE_COUNT) % PHASE_COUNT);
      }}
      style={{ width: '100%' }}>
      <GestureDetector gesture={pan}>
        <Box onLayout={onLayout} style={{ height: THUMB + 16, justifyContent: 'center' }}>
          <Box
            style={{
              position: 'absolute',
              left: THUMB / 2,
              right: THUMB / 2,
              height: TRACK,
              borderRadius: TRACK / 2,
              backgroundColor: theme.colors.border,
            }}
          />
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                height: TRACK,
                borderRadius: TRACK / 2,
                backgroundColor: theme.colors.primary,
              },
              fillStyle,
            ]}
          />
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                width: THUMB,
                height: THUMB,
                borderRadius: THUMB / 2,
                backgroundColor: theme.colors.primary,
                borderWidth: 3,
                borderColor: theme.colors.surface,
                ...theme.shadows.sm,
              },
              thumbStyle,
            ]}
          />
        </Box>
      </GestureDetector>

      <Box style={{ height: 20 }}>
        {width > 0 &&
          MARKS.map((m) => (
            <Text
              key={m.index}
              style={{
                position: 'absolute',
                left: m.index * step + THUMB / 2 - 8,
                fontSize: theme.fontSize.sm,
              }}>
              {m.emoji}
            </Text>
          ))}
      </Box>
    </Box>
  );
};
