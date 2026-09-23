'use client';

import { useState } from 'react';

const systems = [
  {
    id: 'cardiovascular',
    label: 'Cardiovascular',
    title: 'Sistema cardiovascular',
    description: 'Uma prévia visual para localizar estruturas e abrir conexões com conteúdos relacionados.',
    structures: [
      ['Coração', 'Estrutura central da prévia cardiovascular.'],
      ['Grandes vasos', 'Ponto de navegação para relações anatômicas.'],
      ['Circulação', 'Visão integrada disponível na experiência completa.'],
    ],
  },
  {
    id: 'nervoso',
    label: 'Nervoso',
    title: 'Sistema nervoso',
    description: 'Alterne a camada ativa e percorra pontos de estudo sem sair do contexto da disciplina.',
    structures: [
      ['Encéfalo', 'Ponto de entrada para a organização do sistema nervoso.'],
      ['Medula espinal', 'Conexão visual entre estruturas centrais e periféricas.'],
      ['Nervos periféricos', 'Agrupamento para exploração guiada por região.'],
    ],
  },
  {
    id: 'musculoesqueletico',
    label: 'Musculoesquelético',
    title: 'Sistema musculoesquelético',
    description: 'Explore por região, selecione uma estrutura e mantenha os materiais de estudo por perto.',
    structures: [
      ['Esqueleto axial', 'Estruturas organizadas por região anatômica.'],
      ['Membro superior', 'Atalho visual para revisão regional.'],
      ['Membro inferior', 'Atalho visual para revisão regional.'],
    ],
  },
] as const;

type SystemId = (typeof systems)[number]['id'];

export function AtlasExplorer() {
  const [activeSystemId, setActiveSystemId] = useState<SystemId>('cardiovascular');
  const activeSystem = systems.find((system) => system.id === activeSystemId) ?? systems[0];
  const [activeStructure, setActiveStructure] = useState(activeSystem.structures[0][0] as string);

  function selectSystem(systemId: SystemId) {
    const nextSystem = systems.find((system) => system.id === systemId) ?? systems[0];
    setActiveSystemId(systemId);
    setActiveStructure(nextSystem.structures[0][0]);
  }

  const structure = activeSystem.structures.find(([name]) => name === activeStructure) ?? activeSystem.structures[0];

  return (
    <div className="atlas-explorer">
      <div aria-label="Sistemas anatômicos da prévia" className="atlas-explorer__systems">
        {systems.map((system) => (
          <button
            aria-label={`Explorar sistema ${system.label.toLocaleLowerCase('pt-BR')}`}
            aria-pressed={activeSystemId === system.id}
            key={system.id}
            onClick={() => selectSystem(system.id)}
            type="button"
          >
            <span aria-hidden="true" />
            {system.label}
          </button>
        ))}
      </div>

      <div className="atlas-explorer__stage" data-system={activeSystem.id}>
        <div
          aria-label={`Silhueta ilustrativa do ${activeSystem.title.toLocaleLowerCase('pt-BR')}`}
          className="atlas-explorer__figure"
          role="img"
        >
          <span aria-hidden="true" className="atlas-explorer__halo" />
          <svg aria-hidden="true" viewBox="0 0 260 430">
            <defs>
              <linearGradient id="atlas-body" x1="0" x2="1" y1="0" y2="1">
                <stop stopColor="currentColor" stopOpacity=".95" />
                <stop offset="1" stopColor="currentColor" stopOpacity=".28" />
              </linearGradient>
            </defs>
            <circle cx="130" cy="48" fill="url(#atlas-body)" r="32" />
            <path d="M101 84c-20 17-27 64-20 111l12 76-23 124h42l18-101 18 101h42l-23-124 12-76c7-47 0-94-20-111-18 11-40 11-58 0Z" fill="url(#atlas-body)" />
            <path d="m91 111-48 133m126-133 48 133" fill="none" stroke="currentColor" strokeLinecap="round" strokeOpacity=".48" strokeWidth="25" />
            <path className="atlas-explorer__signal" d="M130 85v187M92 166h76M110 295l-8 95m48-95 8 95" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
          </svg>
          <span aria-hidden="true" className="atlas-explorer__scan" />
        </div>

        <div className="atlas-explorer__structures">
          {activeSystem.structures.map(([name], index) => (
            <button
              aria-pressed={activeStructure === name}
              className={`atlas-hotspot atlas-hotspot--${index + 1}`}
              key={name}
              onClick={() => setActiveStructure(name)}
              type="button"
            >
              <span aria-hidden="true" />
              {name}
            </button>
          ))}
        </div>

        <article aria-live="polite" className="atlas-explorer__detail">
          <span className="eyebrow">Camada ativa</span>
          <h3>{activeSystem.title}</h3>
          <p>{activeSystem.description}</p>
          <div>
            <span>Estrutura selecionada</span>
            <strong>{structure[0]}</strong>
            <small>{structure[1]}</small>
          </div>
        </article>
      </div>

      <p className="atlas-explorer__notice">Prévia educacional ilustrativa · Não representa a versão 3D final</p>
    </div>
  );
}
