export type Journal = {
  title: string;
  description: string;
  author: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  notifyPartner: boolean;
  readAt: string | null;
};

export type JournalObject = {
  [id: string]: Journal;
};
