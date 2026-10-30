import { Skia } from '@shopify/react-native-skia';

/**
 * Smooth path through a flat [x0, y0, x1, y1, ...] point list: each point
 * becomes the control point of a curve ending halfway to the next one. Runs on
 * the UI thread while drawing, so it must stay a worklet.
 */
export const buildStrokePath = (points: number[]) => {
  'worklet';
  const path = Skia.Path.Make();
  if (points.length < 2) return path;

  path.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length - 2; i += 2) {
    path.quadTo(
      points[i],
      points[i + 1],
      (points[i] + points[i + 2]) / 2,
      (points[i + 1] + points[i + 3]) / 2,
    );
  }
  path.lineTo(points[points.length - 2], points[points.length - 1]);
  return path;
};
