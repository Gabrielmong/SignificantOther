export type MilestoneKind = 'met' | 'dating' | 'engaged' | 'married' | 'custom';

// The four milestones a room can have at most one of
export type SpecialKind = Exclude<MilestoneKind, 'custom'>;

export interface MilestonePhoto {
  url: string;
  path: string; // Storage path, used to delete the file
  thumbUrl?: string; // Small copy for the gallery grid
  thumbPath?: string;
  width?: number;
  height?: number;
}

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  title: string;
  day: string; // Calendar date "YYYY-MM-DD", no time zone
  emoji: string;
  note?: string;
  photo?: MilestonePhoto;
  placeId?: string; // Reserved for the Places piece
  createdAt: number;
  createdBy: string; // User ID who created it
  updatedAt?: number;
}

export interface MilestoneObject {
  [key: string]: Milestone;
}
