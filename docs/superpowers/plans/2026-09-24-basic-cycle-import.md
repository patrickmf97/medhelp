# MEDHELP Basic Cycle Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar as 83 aulas aprovadas ao catálogo existente, sem duplicação, vazamento premium ou perda de aprendizagem.

**Architecture:** Conversor local sem credenciais produz um pacote validado. Uma operação administrativa transacional compara o pacote com o estado persistido antes de importar; publicação é uma operação separada do lote conferido. O leitor e o catálogo existentes são reutilizados.

**Tech Stack:** Node 22, JavaScript ESM para CLI, Next.js/TypeScript, Supabase/PostgreSQL, testes node:test, Vitest, pgTAP e Playwright já usados no projeto.

**Spec:** docs/superpowers/specs/2026-09-24-basic-cycle-import-design.md — aprovada pelo usuário nesta conversa.

## Global Constraints

- 12 disciplinas, 72 módulos e 83 aulas; conteúdo introdutório, não currículo completo.
- Novas aulas premium; gratuitas existentes preservadas.
- Nenhuma exclusão automática de aulas, progresso ou favoritos.
- Nenhum conteúdo premium em public/ ou no bundle do navegador.
- Importação inicial termina em review, passando por draft conforme as políticas existentes.
- Publicar somente após conferência do lote, sem exposição parcial.
- IDs persistidos não mudam em reimportações.
- Um mês sem parcelamento; mais de um mês comprado de uma vez pode permitir parcelamento. Gateway e cobrança estão fora deste bloco.
- Preservar execução direta pelo assistente. Não delegar a Claude.
- Antes de código Next.js, ler apps/web/AGENTS.md e os guias locais da versão instalada.
- Antes de implementar SQL, conferir changelog/documentação Supabase e checklist de RLS. Gerar nomes de migrations com CLI, nunca inventar timestamps.
- Não operar reset em banco remoto. Testes destrutivos somente em instância local descartável.

## Review Focus

1. Arquivo fora do acervo, symlink ou ID duplicado: conversão falha sem escrita (Task 1).
2. Referências fora das seções de aula e tabelas: preservar referências e relações entre células (Tasks 1 e 3).
3. Reimportação concorrente ou edição humana posterior: conflito sem sobrescrita, lote inteiro revertido (Task 2).
4. Aula gratuita ou já publicada encontrada pelo mesmo slug sem vínculo editorial: conflito explícito, sem assumir identidade (Task 2).
5. Acesso expirado: manter progresso/favoritos, sem retornar corpo premium (Tasks 3 e 4).

## File map

Criar:
- scripts/content/contracts.mjs: validação do pacote e IDs.
- scripts/content/parse-lessons.mjs: extração de aulas, referências e blocos.
- scripts/content/compile.mjs: CLI sem acesso ao banco.
- scripts/content/compile.test.mjs: fixtures e teste do acervo real.
- scripts/content/import.mjs: CLI administrativa, simulação por padrão.
- supabase/tests/content_import_test.sql: autorização e atomicidade.
- apps/web/components/study/lesson-text.tsx e lesson-text.test.tsx: renderizador seguro.
- apps/web/lib/study/group-lessons.ts e group-lessons.test.ts: agrupamento.
- apps/web/tests/e2e/basic-cycle.spec.ts: jornada.
- docs/operations/basic-cycle-import.md: operação e reconciliação.

Modificar:
- apps/web/lib/study/student-service.ts: preservar módulo e usar blocos tipados.
- apps/web/lib/study/progress-service.ts: acrescentar module a StudentLesson.
- apps/web/app/aluno/disciplinas/page.tsx: agrupamento por disciplina e módulo.
- apps/web/app/aluno/disciplinas/[id]/page.tsx: usar LessonText.
- Testes existentes afetados pelo campo module.
- Migration gerada por CLI content_import: vínculo editorial e RPCs administrativas.

Não alterar autenticação, pagamentos ou agendamento de flashcards.

### Task 1: Compilação determinística do acervo

**Interfaces:** compileCatalog(root: string): Promise<ImportBundle>.
ImportBundle = { version: '0.3', digest: string, lessons: ImportedLesson[] }.
ImportedLesson = { editorialId, moduleId, moduleTitle, disciplineCode, disciplineTitle, title, position, summary, sourcePath, sourceHash, blocks }.
Todos os campos são string, exceto position (inteiro) e blocks (array).
Bloco = { block_type: 'heading' | 'rich_text' | 'callout', content: { text: string, format?: 'medhelp-markdown-v1' }, position: number }.

- [ ] Escrever testes antes da implementação:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { compileCatalog } from './compile.mjs';

test('acervo integral e IDs únicos', async () => {
  const bundle = await compileCatalog(process.cwd());
  assert.equal(bundle.lessons.length, 83);
  assert.equal(new Set(bundle.lessons.map(x => x.editorialId)).size, 83);
  assert.equal(new Set(bundle.lessons.map(x => x.moduleId)).size, 72);
  assert.equal(new Set(bundle.lessons.map(x => x.disciplineCode)).size, 12);
  assert(bundle.lessons.every(x => x.blocks.length && x.sourceHash));
});
```

Adicionar fixtures com caminho ../ fora de content, symlink externo, IDs repetidos, aula vazia e seção inexistente; cada caso deve rejeitar. Fixture EG-01 deve produzir duas aulas, não incorporar as oito questões como novas aulas. Fixture EB-04 preserva tabela; CH-01 resolve marcadores S1/S2 em sua seção de referências compartilhada.

- [ ] Rodar `node --test scripts/content/compile.test.mjs`; confirmar falha por módulo ausente.
- [ ] Implementar com fs/promises, path, crypto. Resolver realpath de cada arquivo e aceitar somente content/ciclo-basico ou o caminho exato content/drafts/biologia-celular-divisao-celular.md. Extrair somente títulos de aula reconhecidos no catálogo; parar na próxima seção de mesmo nível que não pertence à aula. Anexar referências compartilhadas identificadas no arquivo.
- [ ] Calcular sourceHash sobre conteúdo e metadados normalizados; ordenar por códigos e posição antes de calcular digest. Não incluir timestamps no hash. Não separar tabelas em células desconectadas; mantê-las no rich_text formatado.
- [ ] Executar novamente os testes. Adicionar modo CLI `node scripts/content/compile.mjs --output <arquivo>` que só grava após validação integral. O módulo importado nos testes não executa CLI.
- [ ] Commit: `feat: compile reviewed basic cycle lessons`.

### Task 2: Simulação e importação administrativa transacional

**Interfaces:** RPC preview_content_import(bundle jsonb) retorna {digest, create, update, unchanged, conflicts, expectedState}.
RPC apply_content_import(bundle jsonb, expected_state text) retorna {batchId, create, update, unchanged}.
RPC publish_content_import(batch_id uuid, expected_state text) publica atomicamente somente o lote conferido.
CLI import.mjs aceita --bundle, --apply e --expected-state; sem --apply apenas simula.

- [ ] Criar testes pgTAP: estudante/anon rejeitados; editor autorizado; primeira aplicação cria 83; segunda cria zero e preserva IDs; alteração editorial concorrente rejeita sem escrita parcial; slug não vinculado rejeita; aula gratuita vinculada mantém free; conteúdo publicado alterado rejeita até revisão editorial explícita; progresso e favoritos idênticos antes/depois.
- [ ] Gerar migration usando `supabase migration new content_import` após verificar ajuda e versão. Executar teste local e confirmar falha por RPC ausente.
- [ ] Criar content_import_bindings com editorial_id único, lesson_id único FK restrict, source_hash, imported_state_hash e batch_id. Criar content_import_batches com digest, estado, ator e contagens. Ativar RLS e restringir leitura/escrita a editor/admin com has_role existente. Revogar EXECUTE de PUBLIC nas três RPCs; conceder apenas authenticated. Usar SECURITY INVOKER, search_path vazio e auth.uid() como ator.
- [ ] Dentro da transação, verificar role, esquema do JSON e hash de estado esperado; obter lock transacional para importações. Mapear ciclo basico existente e slugs editoriais determinísticos ch, ch-01, ch-01-a1. Sem vínculo anterior, qualquer colisão de slug é conflito: não adotar nem sobrescrever.
- [ ] Comparar fingerprint de metadados e blocos atuais com imported_state_hash. Um hash de origem igual não permite ignorar edição humana. Incluir access_level, status, exclusão lógica e blocos no estado observado. Qualquer conflito aborta todo o lote.
- [ ] Inserir novas aulas em draft com auth.uid(), inserir blocos e passar para review. Atualizar somente aulas vinculadas em draft/review cujo fingerprint não mudou; não atualizar aulas published/archived com conteúdo diferente. Não apagar aulas nem tocar nas tabelas de aprendizagem. Na substituição de blocos importados, arquivar os anteriores por deleted_at.
- [ ] Publicação separada valida lote completo, fingerprint e status review, bloqueia linhas e executa transições para published em uma transação. Repetição idêntica retorna estado já aplicado. Não publicar aulas alheias ao lote.
- [ ] CLI usa cliente Supabase já instalado, chave pública e sessão administrativa fornecida por canal seguro no ambiente; nunca imprime token nem assume usuário. Falta de sessão/role é bloqueio, não motivo para obter credenciais privilegiadas. --apply exige expectedState retornado pela simulação. O banco recalcula, não confia nas contagens do cliente.
- [ ] Rodar pgTAP e testes existentes de conteúdo. Commit: `feat: add transactional reviewed content import`.

Algoritmo central obrigatório:

```text
authorize actor
lock import
validate bundle
read current rows
if fingerprint != expectedState: abort
for each lesson:
  if unbound slug collision: abort
  if current fingerprint != stored imported fingerprint: abort
  if unchanged: preserve
  else if published or archived: abort
  else: create/update with stable lesson ID
commit batch and bindings together
```

### Task 3: Leitura segura e catálogo por módulo

**Interfaces:** LessonText({text: string, formatted: boolean}) retorna ReactElement.
groupLessons(lessons: StudentLesson[]) retorna Array<{cycle: string, disciplines: Array<{title: string, modules: Array<{title: string, lessons: StudentLesson[]}>}>}>.
StudentLesson ganha module: string, copiado de PublicCatalogItem.module.

- [ ] Criar testes do renderizador para tabela com cabeçalhos, lista, ênfase, referências HTTPS e texto que contém HTML ou javascript:. HTML deve aparecer como texto; links inseguros não viram âncoras. Testar compatibilidade com blocos antigos sem format.
- [ ] Criar teste de agrupamento: duas aulas do mesmo módulo ficam juntas; módulos de disciplinas diferentes não se fundem; manter ordem recebida dentro de cada módulo.
- [ ] Rodar Vitest focado e confirmar ausência das novas funções.
- [ ] Implementar um subconjunto explícito de Markdown para títulos, parágrafos, listas, links e tabelas; texto renderizado por React, sem dangerouslySetInnerHTML. Validar URLs com URL e allowlist http/https; manter texto legível quando a marcação não é suportada. Tabelas usam table, thead, tbody e th scope=col, com rolagem horizontal no contêiner.
- [ ] Propagar content.format pelo mapper; usar LessonText somente nos blocos textuais do leitor autenticado. Não alterar a consulta que evita carregar blocos quando locked. Preservar controles existentes.
- [ ] Alterar o catálogo para ciclo → disciplina → módulo → aula, mantendo badges de bloqueio e conclusão. Não acrescentar contagens de conteúdo não publicado.
- [ ] Atualizar fixtures com module. Rodar testes de student-service, progress-service e páginas; typecheck e lint. Commit: `feat: present imported lessons by discipline and module`.

Teste de segurança mínimo:

```tsx
render(<LessonText text={'[abrir](javascript:alert(1)) <script>bad()</script>'} formatted />);
expect(screen.queryByRole('link')).toBeNull();
expect(document.querySelector('script')).toBeNull();
```

### Task 4: Verificação e operação do lote

**Interfaces:** documentação com comandos, contagens e resultado real, sem chamar simulação de publicação.

- [ ] Criar E2E com contas sintéticas: aluno sem premium recebe apenas prévia, assinante lê exercício/tabela/referências, conclusão e favorito persistem após novo login; expiração preserva esses dados e bloqueia conteúdo. Testar acesso direto ao endpoint de blocos com sessão sem entitlement.
- [ ] Rodar testes antes de importar fixtures e observar falha por ausência das aulas.
- [ ] Em instância descartável, executar compilação, preview, apply e preview novamente; a segunda simulação deve mostrar 83 unchanged. Publicar lote completo, repetir e confirmar ausência de duplicação.
- [ ] Executar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` e `supabase test db`. Registrar falhas/bloqueios reais, não presumir sucesso. Conferir desktop e mobile e navegação por teclado.
- [ ] Documentar backup prévio e relatório do lote. Produção só após verificar permissões e simulação contra o banco correto. Nenhuma credencial ausente deve ser buscada fora dos meios configurados; informar bloqueio.
- [ ] No banco remoto, caso acessível e testes aprovados, executar preview e comparar com estado esperado antes do apply. Ler contagens e amostras depois; conferir não vazamento antes da publicação final. Sem acesso configurado, entregar código e pacote sem afirmar importação.
- [ ] Recuperação: diante de falha transacional não há lote parcial; após publicação, qualquer retirada de conteúdo usa arquivamento editorial autorizado, nunca exclusão de aulas ou dados de aprendizagem.
- [ ] Commit: `test: verify basic cycle import and student journey`.

## Handoff e revisão

Plano corresponde à especificação aprovada: conversão completa, simulação, importação repetível, conflito conservador, publicação separada, leitura segura e permissões. Pagamentos seguem fora do escopo. Execução direta já solicitada pelo usuário é preservada. Aguardando revisão deste plano antes de iniciar código.
