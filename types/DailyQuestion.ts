// rooms/{roomId}/dailyQuestions/{YYYY-MM-DD}
export type DailyAnswer = {
  text: string;
  answeredAt: number;
  updatedAt?: number;
  /** Answered after the question's day had ended */
  late?: boolean;
};

export type DailyQuestionDay = {
  question?: string;
  answers?: { [uid: string]: DailyAnswer };
};
