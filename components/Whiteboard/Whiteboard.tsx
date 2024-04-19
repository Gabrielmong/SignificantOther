import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { GestureResponderEvent } from 'react-native';
import {
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Button,
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
import ColorPicker, {
  Panel1,
  Swatches,
  Preview,
  OpacitySlider,
  HueSlider,
} from 'reanimated-color-picker';
import { IconButton } from '../IconButton';
import { Brush, Eraser, PaintBucket, Palette, Pipette, UndoDot } from 'lucide-react-native';

export interface PathData {
  path: string[];
  color: string;
  width: number;
}

interface WhiteboardProps {
  pathCallback?: (path: PathData[]) => void;
  canvasColorCallback?: (color: string) => void;
  incomingPaths?: PathData[];
  incomingCanvasColor?: string;
  toolsVisible: boolean;
  setToolsVisible: (visible: boolean) => void;
}
export const Whiteboard = ({
  pathCallback,
  canvasColorCallback,
  incomingPaths,
  incomingCanvasColor,
  toolsVisible,
  setToolsVisible,
}: WhiteboardProps) => {
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentColor, setCurrentColor] = useState<string>('red');
  const [currentWidth, setCurrentWidth] = useState<number>(3);
  const [showModal, setShowModal] = useState(false);
  const [previousPaths, setPreviousPaths] = useState<PathData[]>([]);
  const [canvasColor, setCanvasColor] = useState<string>('white');
  const [brushWidthOpen, setBrushWidthOpen] = useState(false);

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

  const onTouchStart = () => {
    fadeOut();
  };

  const onTouchEnd = (event: GestureResponderEvent) => {
    setBrushWidthOpen(false);
    fadeIn();

    if (currentPath.length === 0) {
      return;
    }

    const pathToSave: PathData = {
      path: currentPath,
      color: currentColor,
      width: currentWidth,
    };

    const newPaths = [...paths, pathToSave];
    setPaths((prevPaths) => newPaths);
    setPreviousPaths((prevPaths) => newPaths);
    pathCallback && pathCallback(newPaths);
    setCurrentPath([]);
  };

  const onTouchMove = (event: GestureResponderEvent) => {
    setBrushWidthOpen(false);
    const locationX = event.nativeEvent.locationX;
    const locationY = event.nativeEvent.locationY;
    const newPoint = `${currentPath.length === 0 ? 'M' : 'L'}${locationX.toFixed(0)},${locationY.toFixed(0)} `;
    setCurrentPath([...currentPath, newPoint]);
  };

  const handleClearButtonClick = () => {
    setPaths([]);
    setCurrentPath([]);
    setPreviousPaths(
      (prevPaths) => [...prevPaths, { path: [], color: 'black', width: 3 }], // default path
    );
  };

  const handleUndoButtonClick = () => {
    const newPaths = [...previousPaths];
    newPaths.pop();
    setPaths(newPaths);
    setPreviousPaths(newPaths);
    pathCallback && pathCallback(newPaths);
  };

  const onSelectColor = ({ hex }: { hex: string }) => {
    setCurrentColor(hex);
  };

  const setInternalCanvasColor = (color: string) => {
    setCanvasColor(color);
    canvasColorCallback && canvasColorCallback(color);
  };

  useEffect(() => {
    if (incomingPaths && incomingPaths.length > 0) {
      setPaths(incomingPaths);
    }
  }, [incomingPaths]);

  useEffect(() => {
    if (incomingCanvasColor) {
      setCanvasColor(incomingCanvasColor);
    }
  }, [incomingCanvasColor]);

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
        gap: 10,
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
            gap: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 50,
          }}>
          <IconButton icon={Eraser} onPress={handleClearButtonClick} />

          <IconButton
            icon={UndoDot}
            onPress={handleUndoButtonClick}
            disabled={previousPaths.length === 0}
          />

          <IconButton icon={Palette} onPress={() => setShowModal(true)} />

          <IconButton icon={PaintBucket} onPress={() => setInternalCanvasColor(currentColor)} />

          <IconButton icon={Brush} onPress={handleOpenBrushWidth} />
        </Animated.View>
      )}
      {brushWidthOpen && (
        <Box
          style={{
            position: 'absolute',
            top: 50,
            right: 0,
            width: 'auto',
            padding: 10,
            flexDirection: 'row',
            justifyContent: 'space-between',
            zIndex: 10,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 50,
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
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <Text>{currentWidth}</Text>
        </Box>
      )}

      <Box
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchStart={onTouchStart}
        style={{
          height: '100%',
          maxHeight: 700,
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1,
        }}>
        <Svg
          height={'100%'}
          width={'100%'}
          style={{ backgroundColor: canvasColor, borderRadius: 15 }}>
          {paths &&
            paths?.map(({ path, color, width }, index) => (
              <Path
                key={`path-${index}`}
                d={path.join('')}
                stroke={color}
                fill="transparent"
                strokeWidth={width}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          {currentPath?.length > 0 && (
            <Path
              d={currentPath.join('')}
              stroke={currentColor}
              fill="transparent"
              strokeWidth={currentWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </Svg>
      </Box>

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
              <Heading size="lg">Color picker</Heading>
              <ModalCloseButton onPress={() => setShowModal(false)}>
                <Icon as={CloseIcon} />
              </ModalCloseButton>
            </ModalHeader>
            <ColorPicker value={currentColor} onComplete={onSelectColor}>
              <Box gap={4} p={10}>
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
