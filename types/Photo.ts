export interface Photo {
  id: string;
  url: string; // Full image (≤ 1600px)
  path: string; // Storage path of the full image
  thumbUrl?: string; // Grid thumbnail (missing on old milestone photos)
  thumbPath?: string;
  width?: number; // Of the full image, for layout
  height?: number;
  day: string; // "YYYY-MM-DD", when it was taken
  label?: string;
  description?: string;
  tags?: Record<string, true>; // Normalized tag → true
  milestoneId?: string; // Set on photos that belong to a milestone
  createdAt: number;
  createdBy: string; // User ID who added it
  updatedAt?: number;
}

export interface PhotoObject {
  [key: string]: Photo;
}
