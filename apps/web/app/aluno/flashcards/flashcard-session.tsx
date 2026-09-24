'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { ReviewGrade } from '@medhelp/domain';
import type { Flashcard } from '@/lib/study/flashcard-service';
import { reviewAction } from './actions';

type StudyCard = Flashcard & { deckTitle: string; isNew: boolean };
const choices: { grade: ReviewGrade; label: string; hint: string }[] = [
  { grade: 'again', label: 'Errei', hint: '1 · 10 min' },
  { grade: 'hard', label: 'Difícil', hint: '2 · mais cedo' },
  { grade: 'good', label: 'Bom', hint: '3 · no ritmo' },
  { grade: 'easy', label: 'Fácil', hint: '4 · mais tarde' },
];

export function FlashcardSession({ cards }: { cards: StudyCard[] }) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const retry = useRef<{ cardId: string; grade: ReviewGrade; eventId: string } | null>(null);
  const remaining = cards.filter((item) => !completedIds.includes(item.id));
  const card = remaining[0];
  const reviewedCount = completedIds.length;
  const sessionTotal = reviewedCount + remaining.length;

  const answer = useCallback((grade: ReviewGrade) => {
    if (!card || !revealed || busy.current) return;
    busy.current = true;
    setError('');
    const eventId = retry.current?.cardId === card.id && retry.current.grade === grade
      ? retry.current.eventId : crypto.randomUUID();
    retry.current = { cardId: card.id, grade, eventId };
    startTransition(async () => {
      try {
        await reviewAction(card.id, grade, eventId);
        retry.current = null;
        setCompletedIds((current) => current.includes(card.id) ? current : [...current, card.id]);
        setRevealed(false);
      } catch {
        setError('Não foi possível salvar. Tente a mesma resposta novamente.');
      } finally { busy.current = false; }
    });
  }, [card, revealed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === ' ' && card && !revealed) { event.preventDefault(); setRevealed(true); }
      if (revealed && /^[1-4]$/.test(event.key)) {
        const choice = choices[Number(event.key) - 1];
        if (choice) answer(choice.grade);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answer, card, revealed]);

  if (!card) return <section className="flashcard-finish" role="status"><span aria-hidden="true">✦</span><h2>Revisão de hoje concluída</h2><p>Você revisou {reviewedCount} {reviewedCount === 1 ? 'cartão' : 'cartões'}. Cada resposta já está salva na sua jornada.</p><Link className="mh-button mh-button--secondary" href="/aluno/progresso">Ver meu progresso ↗</Link></section>;

  return <section className="flashcard-session" aria-label="Sessão de revisão"><div className="flashcard-session__top"><span>{card.deckTitle} · {card.isNew ? 'Novo cartão' : 'Revisão'}</span><strong>{reviewedCount + 1} / {sessionTotal}</strong></div><div className="flashcard-session__track"><span style={{ width: `${(reviewedCount / sessionTotal) * 100}%` }} /></div><div className="flashcard-face"><span className="eyebrow">{revealed ? 'Resposta' : 'Pergunta'}</span><h2>{revealed ? card.back : card.front}</h2>{revealed && card.explanation && <p>{card.explanation}</p>}</div>{revealed ? <div className="flashcard-answer"><p>Como foi lembrar desta resposta?</p><div className="flashcard-grades">{choices.map(({ grade, label, hint }) => <button type="button" key={grade} disabled={pending} onClick={() => answer(grade)}><strong>{label}</strong><small>{hint}</small></button>)}</div></div> : <button className="mh-button mh-button--primary" type="button" onClick={() => setRevealed(true)}>Mostrar resposta <span aria-hidden="true">↗</span></button>}<p className="student-muted flashcard-hint">Use espaço para revelar e as teclas 1–4 para responder.</p>{error && <p className="mh-error-message" role="alert">{error}</p>}</section>;
}
