// One feeling change, stored under
// rooms/{roomId}/feelingHistory/{uid}/{YYYY-MM}/{pushId}
export type FeelingHistoryEntry = {
  feeling: string;
  at: number;
};

export type FeelingHistoryMonth = {
  [pushId: string]: FeelingHistoryEntry;
};
