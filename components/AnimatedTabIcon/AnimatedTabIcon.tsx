import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

type Props = {
  focused: boolean;
  children: React.ReactNode;
};

export function AnimatedTabIcon({ focused, children }: Props) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(focused ? 1.08 : 1, {
          damping: 18,
          stiffness: 200,
        }),
      },
    ],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
