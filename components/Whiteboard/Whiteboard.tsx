import {
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Modal,
  CloseIcon,
  Heading,
  Icon,
  ModalBackdrop,
  ModalCloseButton,
  ModalHeader,
  Box,
  Text,
  ModalContent,
} from '@gluestack-ui/themed';
import { Path } from '@shopify/react-native-skia';
import { Brush, Eraser, PaintBucket, Palette, UndoDot } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import ColorPicker, {
  Panel1,
  Swatches,
  Preview,
  OpacitySlider,
  HueSlider,
} from 'reanimated-color-picker';

import { BoardCanvas } from './BoardCanvas';
import { buildStrokePath } from './strokePath';
import { useAppTheme } from '../../hooks';
import { Stroke } from '../../types';
import { BOARD_WIDTH } from '../../utils/whiteboard';
import { IconButton } from '../IconButton';

// This session's own changes, so undo only takes back what you did
type HistoryEntry = { kind: 'add'; id: string } | { kind: 'clear'; strokes: Stroke[] };

interface WhiteboardProps {
  strokes: Stroke[];
  canvasColor: string;
  /** Saves a finished stroke and returns its id */
  onStrokeAdd: (stroke: Omit<Stroke, 'id'>) => string;
  onStrokesRemove: (ids: string[]) => void;
  onStrokesRestore: (strokes: Stroke[]) => void;
  onCanvasColorChange: (color: string) => void;
  toolsVisible: boolean;
  setToolsVisible: (visible: boolean) => void;
}
export const Whiteboard = ({
  strokes,
  canvasColor,
  onStrokeAdd,
  onStrokesRemove,
  onStrokesRestore,
  onCanvasColorChange,
  toolsVisible,
  setToolsVisible,
}: WhiteboardProps) => {
  const { theme } = useAppTheme();
  const [currentColor, setCurrentColor] = useState<string>('red');
  const [currentWidth, setCurrentWidth] = useState<number>(3);
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [brushWidthOpen, setBrushWidthOpen] = useState(false);
  // Screen pixels per board unit
  const [scale, setScale] = useState(0);

  // The stroke being drawn lives on the UI thread in screen pixels, so drawing
  // never goes through React
  const currentPoints = useSharedValue<number[]>([]);
  const currentStroke = useDerivedValue(() => buildStrokePath(currentPoints.get()));
  // Counts strokes started, so a finished stroke is never cleared over the next one
  const strokeNumber = useSharedValue(0);
  const pendingStrokeRef = useRef<{ id: string; number: number } | null>(null);

  // Keep drawing a finished stroke until it comes back in `strokes`, so it
  // never blinks out between the gesture ending and the save
  useEffect(() => {
    const pending = pendingStrokeRef.current;
    if (!pending || !strokes.some((stroke) => stroke.id === pending.id)) return;
    pendingStrokeRef.current = null;
    if (strokeNumber.get() === pending.number) currentPoints.set([]);
  }, [strokes, currentPoints, strokeNumber]);

  const fadeAnim = useRef(new Animated.Value(1)).current; // Animated value for opacity

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
    setToolsVisible(false);
  };

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    setToolsVisible(true);
  };

  const handleStrokeStart = () => {
    setBrushWidthOpen(false);
    fadeOut();
  };

  const handleStrokeEnd = (points: number[], number: number) => {
    fadeIn();

    // A tap without movement is a single point, which draws as a dot
    if (points.length < 2 || scale === 0) {
      if (strokeNumber.get() === number) currentPoints.set([]);
      return;
    }

    const id = onStrokeAdd({
      points: points.map((value) => value / scale),
      color: currentColor,
      width: currentWidth / scale,
      createdAt: Date.now(),
    });
    pendingStrokeRef.current = { id, number };
    setHistory((prev) => [...prev, { kind: 'add', id }]);
  };

  const drawGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      strokeNumber.set(strokeNumber.get() + 1);
      currentPoints.set([event.x, event.y]);
      runOnJS(handleStrokeStart)();
    })
    .onUpdate((event) => {
      currentPoints.modify((points) => {
        'worklet';
        points.push(event.x, event.y);
        return points;
      });
    })
    .onFinalize(() => {
      runOnJS(handleStrokeEnd)(currentPoints.get(), strokeNumber.get());
    });

  const handleClearButtonClick = () => {
    if (strokes.length === 0) return;
    setHistory((prev) => [...prev, { kind: 'clear', strokes }]);
    onStrokesRemove(strokes.map((stroke) => stroke.id));
  };

  const handleUndoButtonClick = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory(history.slice(0, -1));
    if (last.kind === 'add') {
      onStrokesRemove([last.id]);
    } else {
      onStrokesRestore(last.strokes);
    }
  };

  const onSelectColor = ({ hex }: { hex: string }) => {
    'worklet';
    runOnJS(setCurrentColor)(hex);
  };

  const handleOpenBrushWidth = () => {
    setBrushWidthOpen((prev) => !prev);
  };

  return (
    <Box
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: theme.spacing[3],
        flex: 1,
      }}>
      {toolsVisible && (
        <Animated.View
          style={{
            opacity: fadeAnim,
            position: 'absolute',
            top: 0,
            right: 0,
            width: 'auto',
            gap: theme.spacing[2],
            flexDirection: 'row',
            justifyContent: 'space-between',
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: theme.radii.full,
            padding: theme.spacing[2],
          }}>
          <IconButton icon={Eraser} onPress={handleClearButtonClick} variant="ghost" />

          <IconButton
            icon={UndoDot}
            onPress={handleUndoButtonClick}
            disabled={history.length === 0}
            variant="ghost"
          />

          <IconButton icon={Palette} onPress={() => setShowModal(true)} variant="ghost" />

          <IconButton
            icon={PaintBucket}
            onPress={() => onCanvasColorChange(currentColor)}
            variant="ghost"
          />

          <IconButton icon={Brush} onPress={handleOpenBrushWidth} variant="ghost" />
        </Animated.View>
      )}
      {brushWidthOpen && (
        <Box
          style={{
            position: 'absolute',
            top: 50,
            right: 0,
            width: 'auto',
            padding: theme.spacing[3],
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: theme.radii.full,
            gap: theme.spacing[2],
            ...theme.shadows.lg,
          }}>
          <Slider
            style={{ width: 200 }}
            step={1}
            value={currentWidth}
            minValue={1}
            maxValue={10}
            onChange={(value) => {
              setCurrentWidth(value);
            }}>
            <SliderTrack
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                height: 6,
                borderRadius: theme.radii.full,
              }}>
              <SliderFilledTrack
                style={{
                  backgroundColor: theme.colors.white,
                  borderRadius: theme.radii.full,
                }}
              />
            </SliderTrack>
            <SliderThumb
              style={{
                backgroundColor: theme.colors.white,
                width: 20,
                height: 20,
                borderRadius: theme.radii.full,
                borderWidth: 2,
                borderColor: theme.colors.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}
            />
          </Slider>
          <Text
            style={{
              color: theme.colors.white,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            {currentWidth}
          </Text>
        </Box>
      )}

      <GestureDetector gesture={drawGesture}>
        <View
          onLayout={(event) => setScale(event.nativeEvent.layout.width / BOARD_WIDTH)}
          style={{
            height: '100%',
            maxHeight: 700,
            width: '100%',
            zIndex: 1,
          }}>
          <BoardCanvas
            strokes={strokes}
            canvasColor={canvasColor}
            style={{ flex: 1, borderRadius: theme.radii.lg }}>
            <Path
              path={currentStroke}
              color={currentColor}
              style="stroke"
              strokeWidth={currentWidth}
              strokeJoin="round"
              strokeCap="round"
            />
          </BoardCanvas>
        </View>
      </GestureDetector>

      <Box
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
        }}>
        <Modal isOpen={showModal}>
          <ModalBackdrop onPress={() => setShowModal(false)} />

          <ModalContent>
            <ModalHeader>
              <Heading
                size="lg"
                style={{
                  color: theme.colors.text,
                }}>
                Color picker
              </Heading>
              <ModalCloseButton onPress={() => setShowModal(false)}>
                <Icon as={CloseIcon} />
              </ModalCloseButton>
            </ModalHeader>
            <ColorPicker value={currentColor} onComplete={onSelectColor}>
              <Box gap={theme.spacing[4]} p={theme.spacing[3]}>
                <Preview />
                <Panel1 />
                <HueSlider />
                <OpacitySlider />
                <Swatches />
              </Box>
            </ColorPicker>
          </ModalContent>
        </Modal>
      </Box>
    </Box>
  );
};
