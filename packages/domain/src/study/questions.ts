export type OptionId = 'A' | 'B' | 'C' | 'D';
export type QuestionOutcome = 'correct' | 'incorrect' | 'unanswered' | 'annulled';

export function scoreQuestion(optionId: OptionId | null, answer: OptionId, annulled: boolean): QuestionOutcome {
  if (annulled) return 'annulled';
  if (optionId === null) return 'unanswered';
  return optionId === answer ? 'correct' : 'incorrect';
}

export function summarizeAttempt(results: readonly QuestionOutcome[]) {
  const counts = { correct: 0, incorrect: 0, unanswered: 0, annulled: 0 };
  for (const result of results) counts[result] += 1;
  const validTotal = counts.correct + counts.incorrect + counts.unanswered;
  return { ...counts, validTotal, percentage: validTotal ? counts.correct * 100 / validTotal : null };
}
