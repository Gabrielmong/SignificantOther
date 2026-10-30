import { LegacyPath, StoredStroke, Stroke } from './Whiteboard';

export type WhiteboardSnapshot = {
  strokes: Stroke[];
  canvasColor: string;
  savedBy: string;
  savedAt: string;
};

/** A snapshot as stored; ones saved before v2 only have `paths` */
export type StoredWhiteboardSnapshot = Omit<WhiteboardSnapshot, 'strokes'> & {
  strokes?: StoredStroke[];
  paths?: LegacyPath[];
};
