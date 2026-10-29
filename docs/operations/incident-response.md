# Resposta a incidentes — MEDHELP

## Realidade atual: quem responde e como se sabe que há um incidente

Hoje a operação é feita por uma pessoa (Patrick), sem equipe de on-call e **sem monitoramento de
erro automatizado**: não há Sentry nem qualquer outra ferramenta de observabilidade integrada ao
código (confirmado: nenhuma referência a `sentry` em `apps/web`), não há páginas `error.tsx` ou
`global-error.tsx` customizadas no app, e não existe identificador de correlação exposto ao usuário
para suporte. Isso significa que, até essas peças existirem, **a forma real de descobrir um
incidente é**: relato de usuário, verificação manual do painel da Vercel/Supabase, ou alguém notar
durante o próprio uso do produto. Trate a lacuna de observabilidade como uma pendência real de
lançamento (ver seção final), não como algo já coberto.

## Onde olhar primeiro

- **Vercel** (deploy e runtime do Next.js): painel do projeto → Deployments (status do build e do
  deploy atual) e Logs (erros de função/servidor em tempo real, incluindo os Server Actions em
  `apps/web/lib/auth/actions.ts`, `apps/web/app/editor/**/actions.ts` etc.).
- **Supabase** (projeto `uikzqfwqvmracuvwdabb`): painel → Logs & Analytics para Postgres, Auth e
  API; painel → Database → Roles/Policies para conferir RLS; painel → Reports para erros 4xx/5xx
  da API REST/PostgREST.
- **Cloudflare R2**: painel do bucket `medhelp-media` → Metrics, para erros de upload/download e
  uso de armazenamento; ver `docs/operations/r2-media.md` para como as URLs assinadas funcionam.
- **GitHub Actions**: a única esteira hoje é `.github/workflows/database-tests.yml` (pgTAP +
  `node scripts/content/ci-journey.mjs`, que roda a suíte Playwright completa em
  `apps/web/tests/e2e/` contra um Supabase local descartável). Uma falha recorrente nela depois de
  um merge em `main` é o primeiro sinal de regressão antes de qualquer usuário reportar algo.

## Classificação de severidade

| Nível | Critério | Exemplos reais na plataforma atual |
|---|---|---|
| Sev1 | Indisponibilidade total, vazamento de dados pessoais ou de conteúdo premium, perda de dados | Site fora do ar na Vercel; política RLS permitindo leitura de `lesson_blocks` premium por usuário sem assinatura; `service_role`/chaves do R2 expostas |
| Sev2 | Degradação parcial que afeta uma jornada mas não todas | Cadastro ou recuperação de senha fora do ar (SMTP do Resend, ver `docs/operations/auth-email-setup.md`); upload de anexos falhando; importação/publicação editorial bloqueada |
| Sev3 | Bug visível, sem perda de dados nem bloqueio de jornada crítica | Erro de estilo, aula com texto incorreto, aviso de acessibilidade isolado |

## Playbooks para os módulos que já existem em produção

### Autenticação e e-mails (cadastro, login, recuperação)

1. Confirmar se o problema é de **entrega de e-mail** (confirmação/recuperação não chegam) ou de
   **login** (usuário confirmado não consegue entrar).
2. Para e-mail: verificar no Supabase **Authentication → Logs** se o envio foi disparado; depois
   verificar no Resend (domínio `auth.<domínio MEDHELP>`, ver `docs/operations/auth-email-setup.md`)
   se a mensagem foi aceita/entregue. O limite padrão de `auth.rate_limit.email_sent` é baixo
   (2/hora no ambiente local, configurável em produção pelo SMTP próprio) — confirmar que não é
   apenas rate limit.
3. Para login: `requireUser`/`requireRole` (`apps/web/lib/auth/require-role.ts`) dependem de
   `supabase.auth.getUser()`; um erro genérico de login sem detalhe (`genericLoginError` em
   `apps/web/lib/auth/actions.ts`) é intencional para não vazar se o e-mail existe — não é por si
   só um sinal de incidente, apenas confirme com uma conta de teste própria antes de escalar.
4. Se o problema for amplo (muitos usuários), checar o status do Supabase Auth no painel do
   projeto antes de qualquer alteração de configuração.

### Vazamento ou bloqueio indevido de conteúdo (RLS)

1. Qualquer suspeita de que um usuário sem assinatura ativa está lendo `lesson_blocks`,
   `attachments` ou `summaries` de uma aula premium é **Sev1**. Primeiro passo: reproduzir com uma
   conta de teste sem `subscriptions.state = 'active'/'grace'` e sem `access_grants` vigente,
   exatamente como faz `apps/web/tests/e2e/basic-cycle.spec.ts` (consulta direta via client anônimo
   às tabelas, não só pela UI).
2. Se reproduzir, revisar as policies da migration relevante
   (`supabase/migrations/20260922233027_security_hardening.sql` e `20260922222512_content.sql`)
   contra o estado atual do banco de produção — alguém pode ter alterado uma policy manualmente
   pelo painel. Políticas RLS devem negar por padrão; qualquer policy `USING (true)` em tabela de
   conteúdo premium é suspeita.
3. Se confirmado em produção, revogar a policy incorreta imediatamente (ela nega acesso, não um
   dado já lido: não é possível "desvazar" o que já foi baixado, então o próximo passo é avaliar
   quais aulas/arquivos estavam expostos e por quanto tempo, usando os logs de API do Supabase).
4. Um estudante legítimo sendo bloqueado indevidamente (falso positivo de RLS) é Sev2: confirmar
   `subscriptions.state`/`access_until` e `access_grants` para o usuário specific antes de alterar
   qualquer policy.

### Importação e publicação de conteúdo editorial

Ver `docs/operations/basic-cycle-import.md` para o fluxo completo. Em caso de incidente:

1. Um erro `40001` durante `apply_content_import` ou `publish_content_import` é esperado sob
   conflito de estado (outra operação concorrente) — **não é falha**, é a trava funcionando; não
   repita automaticamente, abra os `conflicts` retornados e reconcilie manualmente.
2. Uma publicação que afete aulas incorretas (texto errado, aula errada marcada como publicada) é
   Sev2 enquanto não afetar cobrança: o rollback é editorial (voltar o `status` pela própria
   interface de `/editor/conteudos` ou por uma nova importação corrigida), não uma restauração de
   banco — restauração completa é desproporcional para um erro de conteúdo.
3. Se uma importação corrompeu dados de progresso/favoritos dos alunos (não deveria: a importação
   nunca deleta `lesson_progress`/`favorites`, só aplica `deleted_at` lógico em blocos
   substituídos), isso é Sev1 e exige o runbook de `docs/operations/backup-restore.md`.

### Mídia e R2

1. Upload falhando: confirmar primeiro se é expiração da URL assinada (15 minutos, ver
   `docs/operations/r2-media.md`) ou CORS do bucket para a origem de produção. A maioria dos casos
   é um dos dois, não uma falha do R2 em si.
2. Download/visualização de anexo falhando para muitos usuários ao mesmo tempo: checar o painel
   R2 por indisponibilidade do serviço antes de suspeitar da aplicação.
3. Se uma credencial do R2 (`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`) for exposta (log, commit,
   captura de tela compartilhada), é Sev1: revogar a credencial no painel Cloudflare e gerar uma
   nova imediatamente, depois atualizar a variável de ambiente só no painel da Vercel (nunca em
   arquivo versionado).

### Deploy quebrado na Vercel

1. Um deploy que falha no build bloqueia a promoção para produção automaticamente (a versão
   anterior continua servindo) — normalmente não é Sev1 por si só.
2. Um deploy que builda mas quebra em runtime (erro 500 generalizado) é Sev1: use **Instant
   Rollback** da Vercel para o deployment anterior enquanto investiga, em vez de tentar corrigir
   para a frente sob pressão.
3. Sempre confirme `pnpm lint && pnpm typecheck && pnpm test && pnpm build` localmente antes de
   promover uma correção emergencial, mesmo sob pressão de incidente — um deploy corretivo quebrado
   piora um Sev1.

## Comunicação

Não há hoje status page nem canal formal de aviso a usuários — outra lacuna real, não uma decisão
deliberada. Enquanto isso não existir, qualquer incidente Sev1/Sev2 visível a usuários deveria, no
mínimo, ser registrado em texto (data, janela de impacto, causa, correção) no mesmo estilo dos
registros já mantidos em `docs/operations/basic-cycle-import.md`, para existir um histórico
auditável mesmo sem ferramenta dedicada.

## Depois do incidente

1. Registrar o que aconteceu, por quanto tempo e para quem, na documentação operacional (este
   diretório), seguindo o precedente de `basic-cycle-import.md`.
2. Se o incidente envolveu dados de usuário, avaliar a obrigação de aviso sob a LGPD (seção 15 da
   especificação em `docs/superpowers/specs/2026-09-22-medhelp-design.md`) — esta é uma decisão que
   exige o Patrick, não deve ser automatizada por quem responde ao incidente.
3. Adicionar um teste de regressão (pgTAP em `supabase/tests/` para RLS/dados, Playwright em
   `apps/web/tests/e2e/` para jornada) que teria pego o problema, quando fizer sentido.

## Pendências reais antes do lançamento (fora do escopo desta tarefa, mas documentadas aqui)

- Nenhuma ferramenta de monitoramento/alerta de erro (Sentry ou equivalente) está integrada.
- Não há identificador de correlação exposto nas mensagens de erro para o usuário citar ao
  contatar o suporte, apesar de a especificação pedir isso (seção 16).
- Não existem páginas de erro customizadas por módulo (`error.tsx`/`global-error.tsx`).
- Não há rotação de on-call nem canal de status: a operação depende inteiramente da disponibilidade
  do Patrick.

Essas quatro pendências dependem de decisões de produto/custo (por exemplo, qual plano do Sentry
usar) e não foram resolvidas aqui para não travar a entrega desta tarefa; qualquer sessão futura
que for implementá-las deve atualizar este documento.
