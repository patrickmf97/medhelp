import type { OptionId, QuestionOutcome } from '@medhelp/domain';
export type { OptionId, QuestionOutcome } from '@medhelp/domain';

export type Reference = {
  title: string;
  organization: string;
  editionDate: string;
  url: string;
  evidenceLocation: string;
  consultedAt: string;
};
export type PublicQuestion = {
  id: string;
  versionId: string;
  stem: string;
  leadIn: string;
  options: { id: OptionId; text: string }[];
  area: string;
  topic: string;
  estimatedDifficulty: string;
};
export type StudyResult = {
  attemptId: string;
  question: PublicQuestion;
  selectedOptionId: OptionId;
  outcome: QuestionOutcome;
  answer: OptionId;
  rationale: string;
  optionRationales: Record<OptionId, string>;
  references: Reference[];
  replayed: boolean;
};
export type QuestionPage = { items: PublicQuestion[]; total: number };
export type HistoryPage = {
  items: {
    attemptId: string;
    questionId: string;
    versionId: string;
    editorialId: string;
    outcome: QuestionOutcome;
    answeredAt: string;
    mode: 'study' | 'simulation';
  }[];
  total: number;
};
