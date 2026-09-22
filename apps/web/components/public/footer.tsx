import { buttonClassName } from '@medhelp/ui';
import Link from 'next/link';
import { Logo } from './logo';

export function Footer() {
  return <><section className="final-cta"><div className="container"><span className="eyebrow">Seu estudo pode ser mais claro</span><h2>Uma formação exigente merece ferramentas à altura.</h2><Link className={buttonClassName()} href="/cadastro">Começar agora</Link></div></section><footer className="footer"><div className="container footer-grid"><div><Logo /><p>Conhecimento organizado para acompanhar toda a sua formação médica.</p></div><nav aria-label="Institucional"><strong>MEDHELP</strong><Link href="/contato">Contato</Link><Link href="/termos">Termos de uso</Link><Link href="/privacidade">Privacidade</Link><Link href="/creditos-e-licencas">Créditos e licenças</Link></nav><nav aria-label="Produto"><strong>Produto</strong><Link href="#recursos">Recursos</Link><Link href="#atlas">Atlas 3D</Link><Link href="#preco">Preço</Link><Link href="/explorar">Conteúdos gratuitos</Link></nav></div><div className="container footer-bottom"><span>© 2026 MEDHELP</span><span>Conteúdo educacional. Não substitui orientação médica.</span></div></footer></>;
}
