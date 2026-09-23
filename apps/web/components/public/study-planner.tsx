'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

const stages = [
  {
    id: 'basico',
    label: 'Ciclo básico',
    kicker: 'Fundamentos com contexto',
    title: 'Base sólida, progresso visível',
    description:
      'Intercale leitura visual, revisão ativa e conexões entre disciplinas sem perder o fio da formação.',
    focus: 'Anatomia + fisiologia',
    progress: 38,
    tasks: [
      ['Mapa visual', '18 min', '01'],
      ['Revisão guiada', '12 min', '02'],
      ['Flashcards essenciais', '10 min', '03'],
    ],
  },
  {
    id: 'clinico',
    label: 'Ciclo clínico',
    kicker: 'Integração por casos',
    title: 'Conecte achados antes de memorizar condutas',
    description:
      'Organize sinais, sintomas e exames em sequências de estudo que favorecem raciocínio e revisão deliberada.',
    focus: 'Semiologia + clínica',
    progress: 64,
    tasks: [
      ['Caso orientado', '20 min', '01'],
      ['Questões comentadas', '15 min', '02'],
      ['Revisão de erros', '10 min', '03'],
    ],
  },
  {
    id: 'internato',
    label: 'Internato',
    kicker: 'Revisão para a prática',
    title: 'Decida com método sob pressão',
    description:
      'Priorize temas, pratique decisões e retome pontos frágeis em blocos curtos para caber na rotina assistencial.',
    focus: 'Urgência + tomada de decisão',
    progress: 82,
    tasks: [
      ['Plantão simulado', '20 min', '01'],
      ['Revisão de protocolo', '12 min', '02'],
      ['Caderno de erros', '8 min', '03'],
    ],
  },
] as const;

type StageId = (typeof stages)[number]['id'];

export function StudyPlanner() {
  const [activeId, setActiveId] = useState<StageId>('basico');
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeStage = stages.find((stage) => stage.id === activeId) ?? stages[0];

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % stages.length
      : event.key === 'ArrowLeft' ? (index - 1 + stages.length) % stages.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? stages.length - 1
      : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextStage = stages[nextIndex];
    if (!nextStage) return;
    setActiveId(nextStage.id);
    tabsRef.current?.querySelector<HTMLElement>(`#stage-tab-${nextStage.id}`)?.focus();
  }

  return (
    <div className="study-planner">
      <div aria-label="Etapa da formação" className="study-planner__tabs" ref={tabsRef} role="tablist">
        {stages.map((stage, index) => (
          <button
            aria-controls={`stage-panel-${stage.id}`}
            aria-selected={activeId === stage.id}
            className="study-planner__tab"
            id={`stage-tab-${stage.id}`}
            key={stage.id}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            onClick={() => setActiveId(stage.id)}
            role="tab"
            tabIndex={activeId === stage.id ? 0 : -1}
            type="button"
          >
            {stage.label}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`stage-tab-${activeStage.id}`}
        className="study-planner__panel"
        id={`stage-panel-${activeStage.id}`}
        role="tabpanel"
      >
        <div className="study-planner__copy">
          <span className="eyebrow">{activeStage.kicker}</span>
          <h3>{activeStage.title}</h3>
          <p>{activeStage.description}</p>
          <div className="study-planner__focus">
            <span>Foco sugerido</span>
            <strong>{activeStage.focus}</strong>
          </div>
        </div>

        <div className="study-plan-card">
          <div className="study-plan-card__header">
            <div>
              <span>Plano de hoje</span>
              <strong>40 minutos com intenção</strong>
            </div>
            <div
              aria-label={`${activeStage.progress}% da trilha visualizada`}
              className="study-plan-card__progress"
              data-progress={activeStage.progress}
            >
              {activeStage.progress}%
            </div>
          </div>
          <ol>
            {activeStage.tasks.map(([title, duration, number]) => (
              <li key={title}>
                <span aria-hidden="true">{number}</span>
                <div>
                  <strong>{title}</strong>
                  <small>{duration}</small>
                </div>
                <i aria-hidden="true">↗</i>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
