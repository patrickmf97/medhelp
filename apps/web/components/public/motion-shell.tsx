'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

export function MotionShell({ children }: Readonly<{ children: ReactNode }>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    root.dataset.motionReady = 'true';
    root.dataset.reducedMotion = String(reducedMotion);

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      revealNodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    );
    revealNodes.forEach((node) => observer.observe(node));

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      const scrollY = Math.min(window.scrollY, 1200);
      root.style.setProperty('--page-scroll', `${scrollY}px`);
      root.style.setProperty('--hero-drift', `${Math.min(scrollY * 0.16, 96)}px`);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateScroll);
    };
    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div data-motion-root="true" ref={rootRef}>
      {children}
    </div>
  );
}
