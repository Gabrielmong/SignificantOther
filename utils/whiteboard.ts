/**
 * Whiteboard format helpers
 * Pure functions (no React Native, no Firebase) so they can be checked
 * outside the app.
 */

import type { LegacyPath, StoredStroke, Stroke } from '../types/Whiteboard';

/** Width of the board in board units, whatever the screen size */
export const BOARD_WIDTH = 1000;

/** "x,y x,y ..." with whole board units (one unit is well under a pixel) */
export const encodePoints = (points: number[]) => {
  const pairs: string[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    pairs.push(`${Math.round(points[i])},${Math.round(points[i + 1])}`);
  }
  return pairs.join(' ');
};

export const decodePoints = (encoded: string) => {
  const points: number[] = [];
  for (const pair of encoded.split(' ')) {
    const [x, y] = pair.split(',').map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push(x, y);
  }
  return points;
};

export const toStoredStroke = ({ points, color, width, createdAt }: Omit<Stroke, 'id'>) => ({
  points: encodePoints(points),
  color,
  width: Math.round(width * 10) / 10,
  createdAt,
});

/**
 * Strokes in drawing order from a stored `strokes` node. Accepts an array too,
 * which is how snapshots keep theirs.
 */
export const strokesFromStored = (
  stored: Record<string, StoredStroke> | StoredStroke[] | null | undefined,
): Stroke[] =>
  Object.entries(stored ?? {})
    .filter(([, stroke]) => stroke && typeof stroke.points === 'string')
    .map(([id, stroke]) => ({
      id,
      points: decodePoints(stroke.points),
      color: stroke.color,
      width: stroke.width,
      createdAt: stroke.createdAt ?? 0,
    }))
    .sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const LEGACY_POINT = /[ML]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/;

/**
 * Converts pre-v2 strokes, drawn in screen pixels on a canvas
 * `legacyCanvasWidth` wide, to board units. Ids are derived from the position,
 * so converting the same board twice (say on both phones at once) writes the
 * same keys instead of duplicating strokes. `createdAt` is the position, which
 * keeps converted strokes ordered before anything drawn afterwards.
 */
export const convertLegacyPaths = (
  paths: LegacyPath[] | Record<string, LegacyPath> | null | undefined,
  legacyCanvasWidth: number,
): Record<string, StoredStroke> => {
  const scale = BOARD_WIDTH / legacyCanvasWidth;
  const converted: Record<string, StoredStroke> = {};

  Object.values(paths ?? {}).forEach((legacy, index) => {
    const points: number[] = [];
    for (const command of legacy?.path ?? []) {
      const match = LEGACY_POINT.exec(command);
      if (match) points.push(Number(match[1]) * scale, Number(match[2]) * scale);
    }
    // Skips the empty entries old boards used as "cleared" markers
    if (points.length === 0) return;

    converted[`legacy-${String(index).padStart(4, '0')}`] = toStoredStroke({
      points,
      color: legacy.color,
      width: legacy.width * scale,
      createdAt: index,
    });
  });

  return converted;
};
