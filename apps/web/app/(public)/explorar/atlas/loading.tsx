export default function AtlasRealLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando o Atlas 3D" className="explore-page">
      <section className="explore-hero"><div className="container"><div className="catalog-skeleton catalog-skeleton--title" /></div></section>
      <section className="section"><div className="container"><div className="catalog-skeleton atlas-viewer-skeleton" /></div></section>
    </div>
  );
}
