export default function ExploreLoading() {
  return (
    <div className="explore-page" aria-busy="true" aria-label="Carregando catálogo">
      <section className="explore-hero"><div className="container"><div className="catalog-skeleton catalog-skeleton--title" /></div></section>
      <section className="section"><div className="container"><div className="catalog-skeleton catalog-skeleton--filters" /><div className="catalog-grid"><div className="catalog-skeleton catalog-skeleton--card" /><div className="catalog-skeleton catalog-skeleton--card" /><div className="catalog-skeleton catalog-skeleton--card" /></div></div></section>
    </div>
  );
}
