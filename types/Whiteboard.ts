// Coordinates and widths are in board units: the board is BOARD_WIDTH units
// wide on every device, so a drawing looks the same on both phones and
// previews scale instead of cropping.

/** A stroke as drawn: points flattened to [x0, y0, x1, y1, ...] */
export type Stroke = {
  id: string;
  points: number[];
  color: string;
  width: number;
  createdAt: number;
};

/** A stroke as stored in the database: points as "x,y x,y ..." */
export type StoredStroke = {
  points: string;
  color: string;
  width: number;
  createdAt: number;
};

export type WhiteboardBoard = {
  strokes: Stroke[];
  canvasColor: string;
  name: string;
};

/**
 * Pre-v2 stroke: SVG commands ("M12,40 ", "L13,42 ") in the drawing phone's
 * screen pixels. Still read to convert old boards and snapshots.
 */
export type LegacyPath = {
  path?: string[];
  color: string;
  width: number;
};
