import { Badge, buttonClassName } from '@medhelp/ui';
import Link from 'next/link';

export function Pricing() {
  return <section className="section pricing" id="preco"><div className="container pricing-grid"><div><span className="eyebrow">Plano simples, sem pegadinhas</span><h2>Tudo o que você precisa por um valor que cabe na rotina</h2><p>Um único plano para acessar as ferramentas premium da MEDHELP.</p></div><article className="price-card"><Badge>Plano MEDHELP</Badge><div className="price"><strong>R$ 30</strong><span>/mês</span></div><ul><li>Resumos e aulas premium</li><li>Flashcards e questões comentadas</li><li>Biblioteca acadêmica</li><li>Atlas 3D interativo</li><li>Progresso preservado</li></ul><Link className={buttonClassName()} href="/cadastro">Começar agora</Link><small>Cancele quando quiser.</small></article></div></section>;
}
