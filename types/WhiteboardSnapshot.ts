import { PathData } from '../components';

export type WhiteboardSnapshot = {
  paths: PathData[];
  canvasColor: string;
  savedBy: string;
  savedAt: string;
};
