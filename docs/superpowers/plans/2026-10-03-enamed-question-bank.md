# MEDHELP Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar banco Premium com importação de lotes, revisão, resolução, comentários, histórico, favoritos, caderno de erros e simulados sem vazar gabaritos.

**Architecture:** Conteúdo público pré-resposta separado de chaves/comentários privados; correção e transições por RPC autenticada com autorização interna. Next.js reutiliza sessão e acesso existentes, sem chave privilegiada no navegador. O plano editorial produz o JSON; o aplicativo nunca gera conteúdo médico em runtime.

**Tech Stack:** Next.js 16.3.6, React 19.3.0, TypeScript 6.0.3, Supabase/Postgres, pnpm 10.19.0, Vitest, Playwright e testes SQL existentes.

**Spec:** docs/superpowers/specs/2026-10-03-enamed-question-bank-design.md

## Global Constraints

- Banco restrito ao acesso Premium vigente; administração não concede assinatura.
- Importação não publica; aprovação clínica qualificada e aprovação editorial são registradas por versão.
- Nenhuma resposta/explicação no payload anterior à submissão; simulado só revela resultados após finalizar.
- Não alterar 83 aulas, progresso existente, flashcards, pagamentos, preço ou cobrança.
- Dados de alunos privados por proprietário; score calculado no servidor; resultado final imutável.
- Sem serviços novos pagos, migração remota antes de verificação ou secrets em cliente.
- Ler `apps/web/AGENTS.md` e documentação local de Next antes de editar aplicação; consultar documentação Supabase atual antes de SQL.
- Conteúdo clínico real permanece fora de Git público; testes usam conteúdo fictício sem afirmações clínicas.

## Review Focus

- Assinatura expira entre abertura e submissão: tarefa 2 nega nova resposta, não concede direito pelo estado da UI.
- Reenvio de chave com opção diferente: tarefa 2 detecta conflito e mantém a primeira resposta.
- Duas finalizações simultâneas: tarefa 6 congela uma única conclusão e reutiliza resultado.
- Questão alterada/retirada durante simulado: tarefas 2/6 preservam versão histórica, omitem item anulado do denominador e não substituem silenciosamente.
- Importação acima do limite ou texto malicioso: tarefas 3/4 recusam excesso e renderizam como texto seguro, sem executar HTML.

## Dependências e convenções

Contrato de entrada e IDs definidos no plano `2026-10-03-enamed-editorial-pilot.md`, tarefa 1. Não duplicar validador: Node ESM compartilhado pode ganhar `.d.mts` para uso TypeScript. Não adicionar dependências para isso.

Executar em checkout atualizado com main, isolado de trabalho alheio. Antes de alterações: conferir branch/status, estado real de tabelas/rotas e baseline de testes. Migration filenames são produzidos por `pnpm exec supabase migration new question_bank` (e comandos equivalentes dos incrementos); não inventar timestamps. Consultar `pnpm exec supabase --help` e `pnpm exec supabase db --help` antes de comandos do CLI. Nunca resetar produção.

### Task 1: Domínio de pontuação e contratos de serviço

**Files:** Create `packages/domain/src/study/questions.ts`, `packages/domain/src/study/questions.test.ts`; Modify `packages/domain/src/index.ts`; Create `apps/web/lib/questions/types.ts`.

**Interfaces:** `scoreQuestion(optionId: OptionId|null, answer: OptionId, annulled: boolean): 'correct'|'incorrect'|'unanswered'|'annulled'`; `summarizeAttempt(results: QuestionOutcome[]): {correct:number, incorrect:number, unanswered:number, annulled:number, validTotal:number, percentage:number|null}`. `OptionId='A'|'B'|'C'|'D'`.

- [ ] Escrever testes: A/A → correct; B/A → incorrect; null/A → unanswered; annulled=true → annulled; [correct,incorrect,unanswered,annulled] → validTotal 3 e percentage 100/3; só anuladas → percentage null.
- [ ] Rodar `pnpm --filter @medhelp/domain test -- src/study/questions.test.ts`, confirmar falha por função ausente.
- [ ] Implementar funções puras e tipos: `PublicQuestion={id:string,versionId:string,stem:string,leadIn:string,options:{id:OptionId,text:string}[],area:string,topic:string,estimatedDifficulty:string}`; `StudyResult={attemptId:string,question:PublicQuestion,selectedOptionId:OptionId,outcome:QuestionOutcome,answer:OptionId,rationale:string,optionRationales:Record<OptionId,string>,references:Reference[],replayed:boolean}`. Reference reutiliza campos editoriais. `QuestionOutcome` é união retornada acima.
- [ ] Rodar teste e typecheck do domínio; zero falhas. Commit `feat: add question scoring contracts`.

### Task 2: Persistência e correção autenticada

**Files:** CLI-generated migration `question_bank`; Create `supabase/tests/question_bank_test.sql`, `apps/web/lib/questions/study-service.ts`, `apps/web/lib/questions/study-service.test.ts`.

**Interfaces:** SQL `public.submit_question(p_version_id uuid,p_option text,p_event_id uuid) returns jsonb`; serviço `submitStudyAnswer(versionId:string,optionId:OptionId,eventId:string):Promise<StudyResult>`; `getPublishedQuestions(filters:{area?:string,topic?:string,difficulty?:string,page:number}):Promise<{items:PublicQuestion[],total:number}>`, página 20, ordem estável por editorialId/versionId.

- [ ] Criar testes SQL negativos: anônimo, sem Premium, aluno B lendo tentativa de A, opção inexistente, versão não publicada e mesma chave com opção diferente. Testar execução REST e ausência de SELECT de chaves, não apenas UI. Expectativa: recusa ou zero linhas conforme superfície; nenhum gabarito obtido.
- [ ] Rodar testes antes da migração e confirmar falha por objetos ausentes em DB LOCAL.
- [ ] Implementar `public.questions` (identidade), `public.question_versions` (conteúdo sem chave), `public.question_options`, `private.question_keys` (resposta/comentários/fontes), `public.question_attempts` (proprietário, versão, seleção, evento, resultado), com RLS/grants mínimos e versão única por identidade. Revisões imutáveis após publicação; índice de proprietário/data/evento; eventId único por usuário.
- [ ] Implementar RPC pública SECURITY INVOKER delegando a `private.submit_question_internal`, SECURITY DEFINER apenas porque aluno não pode ler a chave; search_path vazio, nomes qualificados, auth.uid não nulo, `private.has_active_access()` e versão elegível verificados internamente. Revogar EXECUTE de PUBLIC/anon e conceder somente authenticated; schema private não exposto. Não aceitar userId ou score do cliente. Lock/idempotência garantem mesma resposta para retry; chave alterada é conflito.
- [ ] Consultar docs atuais antes dessa fronteira privilegiada e executar advisors; testar função interna e wrapper separadamente. Histórico pode mostrar resultado próprio antigo mesmo sem Premium, mas não corpo/comentários; recuperar conteúdo/comentário exige acesso vigente.
- [ ] Serviço server-only usa `requireUser('/aluno/questoes')` e cliente de sessão existente; valida UUID/opção/erro sem log de secrets. Testar paginação além de 1.000 itens sem carregar todo o acervo na UI.
- [ ] Rodar SQL local, testes do serviço e typecheck; zero falhas. Commit `feat: persist protected question attempts`.

### Task 3: Importação, revisão e versionamento administrativos

**Files:** CLI-generated migration `question_bank_editorial`; Create `supabase/tests/question_import_test.sql`, `apps/web/lib/questions/import-service.ts`, `apps/web/lib/questions/import-service.test.ts`, `apps/web/app/admin/questoes/importar/page.tsx`, `apps/web/app/admin/questoes/importar/actions.ts`, `apps/web/app/admin/questoes/page.tsx`, `apps/web/app/admin/questoes/[id]/page.tsx`.

**Interfaces:** `previewQuestionImport(bundle:QuestionBundle):Promise<ImportPreview>`; `applyQuestionImport(bundle:QuestionBundle,digest:string,eventId:string):Promise<{batchId:string,replayed:boolean}>`; `reviewQuestionVersion(versionId:string,decision:'approve'|'reject',reviewer:{name:string,qualification:string},notes:string):Promise<void>`; `publishQuestionBatch(batchId:string):Promise<{published:number}>`; `withdrawQuestionVersion(versionId:string,reason:string,annul:boolean):Promise<void>`.

- [ ] Escrever testes: mesmo ID/version/digest → unchanged; conteúdo diferente mesma versão → conflict; nova versão draft não herda revisão; erro no item 100 reverte lote; editor/aluno não podem aprovar/publicar; arquivo pode declarar checked mas nunca approved/published.
- [ ] Executar testes novos e observar falhas antes de implementar.
- [ ] Criar lotes, bindings e revisões versionadas, privados por admin autorizado. RPCs seguem fronteira invoker/private autorizada tarefa 2; aprovação exige campos reais de qualificação, actor autenticado, versão e decisão, sem fingir verificação externa automática. Importador máximo 100 itens/5 MiB; hash verificado servidor; não buscar URLs recebidas para evitar SSRF.
- [ ] Prévia antes de aplicar; publicar ação separada só para versões aprovadas; transação/row locks bloqueiam edição/publicação concorrente. Reportar conflito legível. Retirada mantém histórico; anulação persiste evento e ajusta resultados válidos via agregação, nunca apaga tentativa.
- [ ] Implementar telas admin com nome/qualificação/observações obrigatórios e aviso de responsabilidade da revisão clínica real. Renderizar texto sem HTML bruto; fixture `<script>` vira texto, não executa.
- [ ] Rodar SQL/import service/component tests e typecheck; zero falhas. Commit `feat: add audited question editorial workflow`.

### Task 4: Resolução e comentários no aluno

**Files:** Create `apps/web/app/aluno/questoes/page.tsx`, `apps/web/app/aluno/questoes/[id]/page.tsx`, `apps/web/app/aluno/questoes/question-session.tsx`, `apps/web/app/aluno/questoes/actions.ts`, `apps/web/app/aluno/questoes/question-session.test.tsx`; Modify navigation em `apps/web/app/aluno/layout.tsx` somente após inspecionar componente efetivo.

**Interfaces:** Consumes serviços tarefas 1–2; `QuestionSession({question:PublicQuestion,onSubmit:(option:OptionId,eventId:string)=>Promise<StudyResult>})`.

Teste mínimo do contrato de visibilidade: `expect(screen.queryByText('Comentário da fixture')).not.toBeInTheDocument()` antes de submissão; após sucesso `expect(screen.getByText('Comentário da fixture')).toBeVisible()`.

- [ ] Teste de componente: antes de responder não há gabarito/comentário; sem opção botão não envia; click duplo usa mesmo evento; falha mantém seleção e mostra erro; sucesso mostra resultado/fontes; texto HTML malicioso não executa.
- [ ] Rodar `pnpm --filter @medhelp/web test -- app/aluno/questoes/question-session.test.tsx` e observar falha inicial.
- [ ] Implementar banco paginado com filtros e total publicado real, bloqueio Premium e retorno seguro ao login. Estado vazio explícito. Salvar tentativa antes de mostrar sucesso; nova tentativa explícita gera novo eventId.
- [ ] Detalhe busca versão publicada válida, sem importar `question_keys` para componentes; conteúdo acessível via teclado e labels associados; link para histórico próprio.
- [ ] Rodar componentes, serviço, typecheck e teste de payload SSR/RSC sem answer/rationale; zero falhas. Commit `feat: add student question practice`.

### Task 5: Histórico, favoritos, caderno de erros e relatos

**Files:** CLI-generated migration `question_bank_learning`; Create `supabase/tests/question_learning_test.sql`, `apps/web/lib/questions/learning-service.ts`, `apps/web/lib/questions/learning-service.test.ts`, `apps/web/app/aluno/questoes/historico/page.tsx`, `apps/web/app/aluno/questoes/erros/page.tsx`, `apps/web/app/aluno/questoes/favoritos/page.tsx`, `apps/web/app/admin/questoes/relatos/page.tsx`; Modify session/actions tarefa 4.

**Interfaces:** `getQuestionHistory(page:number):Promise<HistoryPage>`; `getErrorNotebook(page:number):Promise<QuestionPage>`; `setQuestionFavorite(questionId:string,favorite:boolean):Promise<void>`; `reportQuestionError(versionId:string,reason:string):Promise<{reportId:string}>`. Page aliases mantêm PublicQuestion e paginação da tarefa 2.

Definir em `apps/web/lib/questions/types.ts`: `QuestionPage={items:PublicQuestion[],total:number}`; `HistoryPage={items:{attemptId:string,questionId:string,versionId:string,editorialId:string,outcome:QuestionOutcome,answeredAt:string,mode:'study'|'simulation'}[],total:number}`. Histórico sem Premium mostra só esses metadados; corpo/chave exigem acesso vigente. Relato no modo simulado não deve expor resultado antecipadamente.

- [ ] Testes: última finalizada erro → fila; acerto posterior → sai sem apagar histórico; versão anulada → removida da fila válida; B não lê favoritos/relatos/histórico de A; upsert de favorito repetido sem duplicata.
- [ ] Rodar testes antes da implementação; observar falhas de interfaces ausentes.
- [ ] Criar tabelas dedicadas de favoritos/relatos sem alterar favoritos de aulas; owned RLS e resultado derivado server-side. Motivo de relato 10–2.000 caracteres, sem anexos/dados de paciente; texto seguro em admin. Anulação invalida score agregado mas mantém tentativa rotulada.
- [ ] Implementar telas e filtros paginados, painel admin de relatos; status recebido/em análise/resolvido. Reportar não retira automaticamente questão nem altera nota.
- [ ] Rodar SQL/serviço/typecheck; zero falhas. Commit `feat: add question learning history`.

### Task 6: Simulados e finalização atômica

**Files:** CLI-generated migration `question_bank_simulations`; Create `supabase/tests/question_simulations_test.sql`, `apps/web/lib/questions/simulation-service.ts`, `apps/web/lib/questions/simulation-service.test.ts`, `apps/web/app/admin/questoes/simulados/page.tsx`, `apps/web/app/aluno/questoes/simulados/page.tsx`, `apps/web/app/aluno/questoes/simulados/[id]/page.tsx`, `apps/web/app/aluno/questoes/simulados/[id]/resultado/page.tsx`.

**Interfaces:** `startSimulation(configId:string,eventId:string):Promise<{sessionId:string}>`; `getSimulation(sessionId:string):Promise<{status:'open'|'finished',items:PublicQuestion[],answers:Record<string,OptionId>}>`; `saveSimulationAnswer(sessionId:string,versionId:string,optionId:OptionId):Promise<void>`; `finishSimulation(sessionId:string):Promise<{resultId:string}>`; `getSimulationResult(sessionId:string):Promise<SimulationResult>` (StudyResult entries + summarizeAttempt campos).

Definir `SimulationResult={sessionId:string,finishedAt:string,items:{question:PublicQuestion,selectedOptionId:OptionId|null,outcome:QuestionOutcome,answer:OptionId,rationale:string,optionRationales:Record<OptionId,string>,references:Reference[]}[],summary:ReturnType<typeof summarizeAttempt>}` em types.ts; respostas em branco usam null, não StudyResult obrigatório. Nenhuma função deste plano aceita proprietário arbitrário vindo do cliente.

- [ ] Testes: config 20/50/100; insuficiência → erro sem repetir; versão congelada; respostas persistem refresh; alterar antes de finalizar permitido; após finalizar recusado; resultado/comment RPC antes de finalizar negado; score cliente ignorado; dois finish concorrentes retornam mesmo resultado.
- [ ] Rodar testes SQL/serviço antes da implementação; observar falha inicial.
- [ ] Implementar configs admin e sessões/itens/respostas de propriedade do usuário. RPCs usam identidade/acesso e locks, reservam itens únicos publicados ao início, não substituem versões. Finalização produz tentativas mode=simulation para histórico/caderno da tarefa 5, unique(session,item), atomically e sem acerto parcial durante sessão.
- [ ] Item retirado depois de iniciar permanece na versão congelada para histórico; anulado não entra no denominador; resultado todo anulado → percentage null. Acesso expirado bloqueia continuidade/conteúdo, não apaga sessão; renovar acesso permite retomar.
- [ ] Interface sem timer classificatório nesta fase; finalizar exige ação explícita e informa não respondidas. Percentual exibido como acertos válidos, sem TRI/previsão oficial.
- [ ] Rodar SQL/serviço/typecheck; zero falhas. Commit `feat: add immutable question simulations`.

### Task 7: Verificação integrada e publicação técnica

**Files:** Create `apps/web/tests/e2e/questions.spec.ts`, `scripts/questions/ci-seed.mjs`, `docs/operations/question-bank.md`; Modify CI workflow existente após inspeção para incluir testes SQL/Playwright de questões sem secrets públicos.

**Interfaces:** Consumes todos os serviços; seed exclusivamente fixtures fictícias em DB local isolado; nenhuma concessão na produção para testar.

- [ ] Escrever E2E: admin importa fixture/reimporta unchanged, publica somente após revisão de teste; aluno Premium responde/repete/revisa, favoritos, relato, simulado e refresh; aluno sem Premium bloqueado. Testar aluno B e anon via REST para tentar obter chaves e notas de A, inclusive endpoints internos autorizados.
- [ ] Executar suites relevantes e depois `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; E2E `pnpm --filter @medhelp/web test:e2e -- questions.spec.ts` com serviço local/DB local previamente configurados. Não assumir verde quando há infraestrutura ausente: registrar bloqueio específico.
- [ ] Conferir teclado, foco, carregamento e layout móvel 390px; inspecionar HTML/RSC/REST antes de responder e durante simulado, zero gabaritos. Examinar políticas/advisors, concorrência de finish e reenvio alterado (Review Focus).
- [ ] Documentar migrações, contratos RPC, backup/reversão, importação, aprovação e retirada. Conferir nenhum lote real ou secret no Git/build; relatório por contagem e estado.
- [ ] Apresentar mudança testada para integração/publicação técnica conforme autorização vigente; antes de migração remota registrar snapshot proporcional/restauração verificada. Se não houver autorização vigente, parar nessa fronteira, sem improvisar privilégio ou custo.
- [ ] Após integração/deploy autorizado, confirmar banco vazio ou só itens legitimamente aprovados, bloqueio sem Premium e preservação dos registros anteriores. Publicação de clínica real segue revisão designada, independente de deploy técnico. Commit `test: verify protected question bank journeys`.

## Cobertura e saída

Spec 1–5 → plano editorial e tarefas 1/3; spec 6 → tarefas 4–6; spec 7 → tarefas 2/3/6; spec 8 → tarefa 7 e validação editorial; spec 9 → handoff abaixo. A tarefa 4 do plano editorial cobre expansão dos 49 lotes restantes, sem afirmar conclusão antecipada.

Retorno por etapa: arquivos/commit, testes efetivamente executados, resultado, limitações, quantidades reais de conteúdo e próxima dependência. Não anunciar 5.000 nem trabalho em segundo plano sem os itens entregues.

## Handoff

Método sugerido: execução aqui pelo agente principal, sem delegação por padrão, para reduzir consumo e manter os contratos consistentes. Confirmar revisão dos dois planos antes de implementar. Se Patrick escolher Claude Code, produzir um prompt autocontido por bloco usando as instruções anexadas, incluindo spec, contrato, caminhos, testes e saída esperada.
