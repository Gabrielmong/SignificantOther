import { X } from 'lucide-react-native';
import { useEffect } from 'react';
import { Image, Modal, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

interface ChatImageViewerProps {
  uri: string | null; // Open while set
  onClose: () => void;
}

/** A chat photo full screen: pinch or double tap to zoom, drag to look around */
export const ChatImageViewer = ({ uri, onClose }: ChatImageViewerProps) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Every photo opens unzoomed
  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
  }, [uri, scale, savedScale, translateX, translateY, savedX, savedY]);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 1), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedX.value = 0;
        savedY.value = 0;
      }
    });

  // Only moves a zoomed photo; keeps at least part of it on screen
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      const maxX = (width * (scale.value - 1)) / 2;
      const maxY = (height * (scale.value - 1)) / 2;
      translateX.value = Math.min(Math.max(savedX.value + event.translationX, -maxX), maxX);
      translateY.value = Math.min(Math.max(savedY.value + event.translationY, -maxY), maxY);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > 1 ? 1 : DOUBLE_TAP_SCALE;
      scale.value = withTiming(next);
      savedScale.value = next;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedX.value = 0;
      savedY.value = 0;
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      {/* Modals render outside the app's root view, so gestures need their own root */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
        <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
          <Animated.View style={[StyleSheet.absoluteFill, style]}>
            {uri && (
              <Image
                source={{ uri }}
                resizeMode="contain"
                accessibilityLabel="Photo"
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </Animated.View>
        </GestureDetector>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          hitSlop={12}
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 12,
            padding: 8,
            borderRadius: 999,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}>
          <X size={26} color="#ffffff" />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
};
