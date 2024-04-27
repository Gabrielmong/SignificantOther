export type Journal = {
  title: string;
  description: string;
  author: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
};

export type JournalObject = {
  [id: string]: Journal;
};
