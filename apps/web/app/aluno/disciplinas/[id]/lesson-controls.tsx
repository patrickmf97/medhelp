'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { saveProgressAction, toggleFavoriteAction } from './actions';

export function LessonControls({ lessonId, initialSeconds, initiallyComplete, initiallyFavorite, videoUrl }: { lessonId: string; initialSeconds: number; initiallyComplete: boolean; initiallyFavorite: boolean; videoUrl: string | null }) {
  const [complete, setComplete] = useState(initiallyComplete);
  const [favorite, setFavorite] = useState(initiallyFavorite);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const seconds = useRef(initialSeconds);
  const saved = useRef(initialSeconds);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback((markComplete = false) => {
    if (!markComplete && seconds.current <= saved.current) return;
    const position = Math.min(86_400, Math.max(0, Math.floor(seconds.current)));
    startTransition(async () => {
      try { await saveProgressAction(lessonId, position, markComplete); saved.current = Math.max(saved.current, position); if (markComplete) { setComplete(true); setMessage('Aula concluída. Seu progresso foi salvo.'); } else setMessage('Progresso salvo.'); }
      catch { setMessage('Não foi possível salvar agora. Tente novamente.'); }
    });
  }, [lessonId]);
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') persist(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer.current) clearTimeout(timer.current);
      if (seconds.current > saved.current) {
        void fetch(`/aluno/disciplinas/${lessonId}/progress`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', keepalive: true,
          body: JSON.stringify({ seconds: Math.min(86_400, Math.max(0, Math.floor(seconds.current))), complete: false }),
        }).catch(() => {});
      }
    };
  }, [lessonId, persist]);
  return <div className="lesson-interactions">{videoUrl && <video className="student-video" controls preload="metadata" onLoadedMetadata={(event) => { const video = event.currentTarget; if (initialSeconds > 0 && initialSeconds < video.duration - 2) video.currentTime = initialSeconds; }} onTimeUpdate={(event) => { seconds.current = event.currentTarget.currentTime; if (seconds.current - saved.current >= 10 && !timer.current) timer.current = setTimeout(() => { timer.current = null; persist(); }, 1500); }} onPause={() => persist()} onEnded={() => persist(true)}><source src={videoUrl} />Seu navegador não suporta reprodução de vídeo.</video>}<div className="lesson-interactions__buttons"><button className="mh-button mh-button--primary" type="button" disabled={pending || complete} onClick={() => persist(true)}>{complete ? '✓ Aula concluída' : 'Marcar como concluída'}</button><button className="mh-button mh-button--secondary" type="button" disabled={pending} aria-pressed={favorite} onClick={() => startTransition(async () => { try { await toggleFavoriteAction(lessonId, !favorite); setFavorite(!favorite); setMessage(!favorite ? 'Aula adicionada aos favoritos.' : 'Aula removida dos favoritos.'); } catch { setMessage('Não foi possível atualizar seus favoritos.'); } })}>{favorite ? '♥ Salva' : '♡ Salvar aula'}</button></div><p className="student-muted" role="status" aria-live="polite">{pending ? 'Salvando…' : message || (initialSeconds ? `Retomando de ${Math.floor(initialSeconds / 60)} min ${initialSeconds % 60} s` : 'Seu progresso será salvo durante o vídeo.')}</p></div>;
}
