# Checklist de lançamento — MEDHELP

Baseado nos critérios de aceite do MVP (seção 19) e nos riscos (seção 21) de
`docs/superpowers/specs/2026-09-22-medhelp-design.md`. Cada item diz **o que foi de fato
verificado nesta sessão** (e como), **o que já está automatizado para rodar de novo em CI**, e
**o que ainda depende de alguém** — sem marcar nada como concluído que não tenha sido
genuinamente checado. Marcar um item como feito sem essa verificação é pior do que deixá-lo em
aberto.

Status usados: ✅ verificado nesta sessão · 🤖 automatizado (roda sozinho em CI a cada push) ·
⚠️ parcial/pendência conhecida · ❌ não implementado ainda · 👤 exige decisão ou execução humana
que nenhuma sessão de IA deve tomar sozinha.

## 1. Descoberta e proposta pública

- [x] ✅🤖 Visitante entende proposta, recursos e preço sem cadastro —
      `apps/web/tests/e2e/public-home.spec.ts` cobre a home e passa; `accessibility.spec.ts`
      roda uma varredura axe-core na home e em `/explorar`, `/entrar`, `/cadastro`,
      `/recuperar-senha` sem violações.
- [ ] 👤 **Termos de uso, política de privacidade, créditos e atribuição do BodyParts3D
      publicados** — as páginas `/termos`, `/privacidade`, `/creditos` ainda não existem em
      `main` neste checkout (fazem parte da Task 15 e estão em uma branch ainda não mesclada,
      `feat/legal-seo-security-task15`). Não marque este item como pronto até essa branch ser
      revisada e mesclada, e o conteúdo jurídico revisado por alguém com autoridade para isso —
      não é um texto para uma sessão de IA escrever e aprovar sozinha.
- [ ] ⚠️ Metadados, sitemap, robots.txt e dados estruturados na área pública — mesma situação:
      implementado na branch `feat/legal-seo-security-task15`, não neste checkout de `main`.

## 2. Cadastro, autenticação e recuperação

- [x] ✅🤖 Cadastro → confirmação → login → acesso à aula ponta a ponta —
      `apps/web/tests/e2e/critical-paths.spec.ts` (criado nesta sessão) executa o fluxo real:
      cria conta pela UI, confirma via API administrativa (porque este ambiente não tem caixa de
      entrada), faz login pela UI e chega à aula. Executado e passou contra um Supabase local
      descartável nesta sessão (ver seção de verificação abaixo).
- [ ] 👤 **Confirmação por e-mail real, com o provedor de produção** — o teste acima confirma a
      conta pela API administrativa, não clicando num e-mail real. O clique real no link de
      confirmação/recuperação, com o domínio de envio do Resend configurado
      (`docs/operations/auth-email-setup.md`), só pode ser verificado contra o projeto Supabase
      hospedado e uma caixa de entrada real — peça ao Patrick para testar isso manualmente antes
      do lançamento, como o próprio runbook de e-mail já recomenda.
- [x] ✅🤖 Rota protegida sem sessão preserva o destino e redireciona para `/entrar` —
      `apps/web/tests/e2e/auth.spec.ts`, `student-study.spec.ts`, `flashcards.spec.ts`.
- [x] ✅🤖 Usuário autenticado sem o papel exigido é bloqueado (`/admin`, `/editor`) e um editor
      não herda acesso de admin — `apps/web/tests/e2e/authorization.spec.ts` (criado nesta
      sessão), com os três papéis (`student`, `editor`, `admin`) testados contra o banco real.

## 3. Catálogo, estudo e aprendizagem

- [x] ✅🤖 Navegação por ciclos/disciplinas/módulos/aulas, progresso, favoritos e persistência
      entre sessões — `apps/web/tests/e2e/basic-cycle.spec.ts` (já existia; passou nesta sessão
      contra o catálogo real de 83 aulas importado por `scripts/content/ci-seed.mjs`).
- [x] ✅🤖 Flashcards — `apps/web/tests/e2e/flashcards.spec.ts` e
      `apps/web/app/aluno/flashcards/flashcard-session.test.tsx` (vitest).
- [ ] ❌ Questões/quiz como jornada de estudo end-to-end — as tabelas existem
      (`questions`, `question_options`, `quiz_attempts`, `quiz_answers`), mas não foi encontrada
      nenhuma cobertura e2e de ponta a ponta para essa jornada especificamente neste checkout;
      confirmar se isso já existe em alguma branch não mesclada antes de assumir que falta.

## 4. Biblioteca, Atlas 3D e cobrança

- [ ] ❌ Biblioteca bloqueia publicação sem metadados de direito — não implementado em `main`
      neste checkout (há uma branch separada, `worktree-agent-aac32221ad489d644`, descrita como
      tendo uma biblioteca de ebooks, ainda não mesclada).
- [ ] ❌ Atlas 3D (busca, seleção, filtros, isolamento, relações educacionais, fallback) —
      subprojeto à parte (ver seção 20 da especificação); fora do escopo verificável nesta
      sessão.
- [ ] ❌ Cartão e PIX só alteram acesso após confirmação confiável do provedor — Mercado Pago
      ainda não está integrado (`apps/web/app/admin/pagamentos/page.tsx` é um placeholder;
      nenhuma referência a Mercado Pago ou webhook de pagamento foi encontrada em `apps/web`).
      **Não é seguro cobrar de usuários reais antes deste item existir e ser testado em sandbox.**

## 5. Segurança, RLS e dados

- [x] ✅🤖 RLS com teste automatizado (não é "parece que funciona", é testado) —
      `pnpm exec supabase test db` roda 6 arquivos / 88 asserções pgTAP em
      `supabase/tests/*.sql` e passou nesta sessão contra um banco local recém-criado pelas
      migrations versionadas.
- [x] ✅🤖 Verificação de papel no servidor para operações administrativas — ver item de
      autorização acima; `apps/web/lib/auth/require-role.ts` é exercitado pelo teste real, não só
      lido.
- [x] ✅ Backup e procedimento de restauração documentados —
      `docs/operations/backup-restore.md` (criado nesta sessão). Os comandos `supabase db dump`
      usados no documento foram testados nesta sessão contra o banco local (incluindo a pegadinha
      real de que o schema `auth` é excluído por padrão e precisa de `--schema public,auth`
      explícito); a restauração completa **contra produção**, porém, não foi executada — o
      documento é explícito sobre isso e sobre quem precisa aprovar antes.
- [ ] 👤 **Backup automatizado/agendado** — hoje é manual; ver a pendência registrada no próprio
      runbook. Decisão de plano/custo que só o Patrick pode tomar.

## 6. Resiliência e observabilidade

- [ ] ❌ Monitoramento de erro (Sentry ou equivalente), identificador de correlação, páginas de
      erro por módulo — nenhum dos três está implementado em `main` neste checkout. Documentado
      como pendência em `docs/operations/incident-response.md` (criado nesta sessão).
- [x] ✅ Procedimento de resposta a incidentes documentado —
      `docs/operations/incident-response.md`, com playbooks para os módulos que realmente
      existem hoje (auth, RLS/conteúdo premium, importação editorial, R2, deploy na Vercel).

## 7. Acessibilidade, responsividade e navegadores

- [x] ✅🤖 Varredura automatizada de acessibilidade (axe-core) sem violações nas páginas públicas
      principais, com animações de "reveal" neutralizadas via `prefers-reduced-motion` para
      evitar falso positivo de contraste — `apps/web/tests/e2e/accessibility.spec.ts` (criado
      nesta sessão). **Encontrou e expôs** uma condição de corrida real entre a animação de
      entrada e a varredura de contraste; corrigida no próprio teste, não no produto (não era um
      bug de contraste do produto, e sim do momento em que a varredura rodava).
- [x] ✅🤖 Navegação por teclado: skip link e ordem da navegação principal no desktop —
      `accessibility.spec.ts`. No viewport mobile o menu principal fica fora da árvore de foco até
      ser aberto (comportamento esperado, não testado pelo mesmo caso; a abertura do menu móvel
      por teclado já era testada por `public-home.spec.ts`).
- [x] ✅ Suíte completa executada nos projetos `chromium` (desktop) e `mobile` (emulação Pixel 7
      do Playwright) nesta sessão.
- [ ] ❌ **Teste em dispositivos móveis reais** — a especificação pede isso explicitamente
      (seção 18, "Testes em dispositivos móveis reais antes do lançamento"). A emulação do
      Playwright muda viewport e user agent, não hardware/navegador reais (Safari iOS em
      particular se comporta diferente de Chromium). 👤 Isso exige um dispositivo físico e deve
      ser feito por uma pessoa antes do lançamento; nenhuma sessão automatizada substitui isso.
- [ ] ⚠️ Apenas Chromium foi exercitado nesta sessão (sem Firefox/Safari/WebKit instalados no
      ambiente). `apps/web/playwright.config.ts` já declara os projetos `chromium` e `mobile`;
      adicionar um projeto `webkit`/`firefox` e rodá-lo é recomendado antes do lançamento.

## Como esta sessão verificou o que está marcado ✅

Diferente de sessões anteriores da Task 15, esta sessão conseguiu um Docker funcional no
ambiente e efetivamente:

1. Rodou `pnpm exec supabase start` com sucesso (banco local descartável).
2. Rodou `pnpm exec supabase test db` → 6 arquivos, 88 testes, `PASS`.
3. Rodou `node scripts/content/ci-journey.mjs`, que importa e publica o catálogo real de 83
   aulas e depois executa `pnpm test:e2e` (Playwright) contra esse banco — a mesma sequência que
   `.github/workflows/database-tests.yml` roda em CI. Na primeira execução, 4 testes falharam por
   causas de ambiente (uma condição de corrida de animação, uma asserção de texto ambígua em um
   teste novo, e aparente concorrência/limite de taxa de autenticação do Supabase local sob carga
   de dois workers Playwright simultâneos); corrigidos os dois primeiros no próprio código de
   teste, a segunda execução completa, do zero (banco recriado), terminou com **35 de 35 testes
   passando** (36 menos 1 propositalmente pulado no viewport mobile).
4. Rodou `pnpm lint`, `pnpm typecheck` e `pnpm test` (vitest, 24 arquivos / 71 testes) — todos
   verdes.

Isso não substitui rodar a mesma sequência no CI real antes de mesclar: é a evidência mais forte
disponível localmente, não uma garantia de que o CI vai se comportar exatamente igual (hardware,
paralelismo e rede são diferentes).
