import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { ReactNode, useMemo, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { buildStrokePath } from './strokePath';
import { Stroke } from '../../types';
import { BOARD_WIDTH } from '../../utils/whiteboard';

type BoardCanvasProps = {
  strokes: Stroke[];
  canvasColor: string;
  style?: StyleProp<ViewStyle>;
  /** Drawn on top in screen coordinates, e.g. the stroke being drawn */
  children?: ReactNode;
};

/** Draws a board's strokes scaled from board units to this view's width */
export const BoardCanvas = ({ strokes, canvasColor, style, children }: BoardCanvasProps) => {
  const [width, setWidth] = useState(0);
  const paths = useMemo(
    () => strokes.map((stroke) => ({ ...stroke, path: buildStrokePath(stroke.points) })),
    [strokes],
  );

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[{ backgroundColor: canvasColor, overflow: 'hidden' }, style]}>
      <Canvas style={{ flex: 1 }}>
        <Group transform={[{ scale: width / BOARD_WIDTH }]}>
          {paths.map(({ id, path, color, width: strokeWidth }) => (
            <Path
              key={id}
              path={path}
              color={color}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeJoin="round"
              strokeCap="round"
            />
          ))}
        </Group>
        {children}
      </Canvas>
    </View>
  );
};
