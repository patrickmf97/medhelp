'use client';

import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { PublicCatalogItem } from '@/lib/content/public-catalog';

export type CatalogStatus = 'ready' | 'empty' | 'unavailable';

interface ContentExplorerProps {
  items: PublicCatalogItem[];
  status: CatalogStatus;
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function ContentExplorer({ items, status }: ContentExplorerProps) {
  const [query, setQuery] = useState('');
  const [cycle, setCycle] = useState('all');
  const [access, setAccess] = useState('all');

  const cycles = useMemo(
    () => Array.from(new Map(items.map((item) => [item.cycleSlug, item.cycle])).entries()),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    return items.filter((item) => {
      const searchable = normalize(
        [item.title, item.summary ?? '', item.discipline, item.module, item.cycle].join(' '),
      );
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (cycle === 'all' || item.cycleSlug === cycle) &&
        (access === 'all' || item.accessLevel === access)
      );
    });
  }, [access, cycle, items, query]);

  function clearFilters() {
    setQuery('');
    setCycle('all');
    setAccess('all');
  }

  if (status === 'unavailable') {
    return (
      <div className="catalog-state" role="status">
        <span aria-hidden="true">↻</span>
        <h2>Catálogo temporariamente indisponível</h2>
        <p>A página institucional continua disponível. Tente novamente em alguns instantes.</p>
        <Link className={buttonClassName('secondary')} href="/">Voltar ao início</Link>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="catalog-state catalog-state--empty">
        <span aria-hidden="true">✦</span>
        <h2>Conteúdos em preparação</h2>
        <p>O catálogo editorial está sendo revisado antes da primeira publicação. Você já pode criar sua conta e acompanhar a evolução.</p>
        <div className="catalog-state__cycles" aria-label="Ciclos que farão parte do catálogo">
          <span>Ciclo básico</span><span>Ciclo clínico</span><span>Internato</span>
        </div>
        <Link className={buttonClassName()} href="/cadastro">Criar conta</Link>
      </div>
    );
  }

  return (
    <div className="content-explorer">
      <div className="content-explorer__filters">
        <label className="catalog-search">
          <span className="sr-only">Buscar conteúdos</span>
          <i aria-hidden="true">⌕</i>
          <input
            aria-label="Buscar conteúdos"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque por tema, disciplina ou módulo"
            type="search"
            value={query}
          />
        </label>
        <label>
          <span>Ciclo</span>
          <select onChange={(event) => setCycle(event.target.value)} value={cycle}>
            <option value="all">Todos os ciclos</option>
            {cycles.map(([slug, title]) => <option key={slug} value={slug}>{title}</option>)}
          </select>
        </label>
        <label>
          <span>Acesso</span>
          <select onChange={(event) => setAccess(event.target.value)} value={access}>
            <option value="all">Todos</option>
            <option value="free">Gratuitos</option>
            <option value="premium">Premium</option>
          </select>
        </label>
      </div>

      <div className="content-explorer__summary" aria-live="polite">
        <span><strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? 'conteúdo encontrado' : 'conteúdos encontrados'}</span>
        {filteredItems.length > 0 && (query || cycle !== 'all' || access !== 'all') ? <button onClick={clearFilters} type="button">Limpar filtros</button> : null}
      </div>

      {filteredItems.length > 0 ? (
        <div className="catalog-grid">
          {filteredItems.map((item) => (
            <article className="catalog-card" key={item.id}>
              <div className="catalog-card__meta">
                <Badge>{item.accessLevel === 'free' ? 'Gratuito' : 'Premium'}</Badge>
                <span>{item.cycle}</span>
              </div>
              <div>
                <small>{item.discipline} · {item.module}</small>
                <h2>{item.title}</h2>
                <p>{item.summary ?? 'Descrição editorial em preparação.'}</p>
              </div>
              <Link href={item.accessLevel === 'free' ? `/explorar/aula/${item.id}` : '/#preco'}>
                {item.accessLevel === 'free' ? 'Ler amostra gratuita' : 'Conhecer o plano'}
                <span aria-hidden="true">↗</span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="catalog-no-results" role="status">
          <span aria-hidden="true">⌕</span>
          <h2>Nenhum conteúdo encontrado</h2>
          <p>Tente um termo mais amplo ou remova os filtros atuais.</p>
          <button className={buttonClassName('secondary')} onClick={clearFilters} type="button">Limpar filtros</button>
        </div>
      )}
    </div>
  );
}
