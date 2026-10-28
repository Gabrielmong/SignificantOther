// rooms/{roomId}/dailyQuestions/{YYYY-MM-DD}
export type DailyAnswer = {
  text: string;
  answeredAt: number;
  updatedAt?: number;
};

export type DailyQuestionDay = {
  question?: string;
  answers?: { [uid: string]: DailyAnswer };
};
