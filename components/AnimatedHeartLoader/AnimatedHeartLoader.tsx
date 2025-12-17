import React, { useEffect } from 'react';
import { Box } from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '../../hooks';

export const AnimatedHeartLoader: React.FC = () => {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    // Heartbeat animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 400, easing: Easing.ease }),
        withTiming(1, { duration: 400, easing: Easing.ease }),
      ),
      -1,
      false,
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.ease }),
        withTiming(0.6, { duration: 400, easing: Easing.ease }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!theme?.gradients?.primary) {
    return null;
  }

  return (
    <Box
      style={{
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: 100,
      }}>
      {/* Gradient background circle */}
      <LinearGradient
        colors={theme?.gradients?.primary.colors}
        start={theme?.gradients?.primary.start}
        end={theme?.gradients?.primary.end}
        style={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: 40,
          opacity: 0.2,
        }}
      />
      {/* Animated Heart icon */}
      <Animated.View style={animatedStyle}>
        <Heart
          size={40}
          color={theme?.gradients?.primary.colors[0]}
          fill={theme?.gradients?.primary.colors[0]}
        />
      </Animated.View>
    </Box>
  );
};
