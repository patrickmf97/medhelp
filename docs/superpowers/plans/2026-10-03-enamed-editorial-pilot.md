# MEDHELP Enamed Editorial Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir e entregar 100 questões originais completas em rascunho, com matriz, referências verificadas e relatório de revisão, preparando expansão a 5.000.

**Architecture:** Contrato JSON versionado compartilhado com o plano do aplicativo. Ferramentas de validação e relatório ficam no repositório; conteúdo real e gabaritos ficam em arquivos privados, fora de Git público. Autoria e checagem assistida não substituem revisão clínica.

**Tech Stack:** Node.js 22–24, módulos ESM, node:test; Markdown e JSON UTF-8; sem API paga de geração ou vetores.

**Spec:** docs/superpowers/specs/2026-10-03-enamed-question-bank-design.md

## Global Constraints

- Meta editorial: 5.000 questões distintas aprovadas; primeiro lote incluído na meta.
- Piloto: 100 itens, 20 por área, 5 fáceis / 10 médios / 5 difíceis por área; no mínimo 10 itens com marcador saúde mental.
- Exatamente quatro alternativas A–D e uma melhor resposta por questão.
- Referências consultadas sustentam o gabarito e todos os comentários; nenhuma referência fabricada.
- Nenhum rascunho/gabarito real em Git público, aplicação pública ou seed de produção.
- Aprovação clínica depende de revisor real identificado e qualificado; ausência do revisor não bloqueia rascunhos, mas bloqueia aprovação/publicação.
- Nenhum novo serviço pago, cobrança, alteração de aulas ou concessão real de Premium.

## Review Focus

- Referência existente mas sem sustentação da conduta: tarefa 2 registra localização e tarefa 3 checa item individualmente.
- Mesmo caso com nome/idade diferentes: tarefa 1 sinaliza semelhança e tarefa 3 decide originalidade substantiva.
- Alternativa diferente na redação mas equivalente clinicamente: tarefa 3 exige uma única melhor resposta defensável.
- Mudança de guideline após autoria: tarefa 3 registra data/versão, mantendo o item pendente se houver conflito.
- Acervo com 100 registros mas distribuição errada: tarefa 1 testa contagem por área, dificuldade e saúde mental.

## Contrato compartilhado com o aplicativo

Arquivo `scripts/questions/contracts.mjs` exporta `validateQuestionBundle(value: unknown): ValidationResult`, `canonicalQuestionHash(item: QuestionDraft): string`, `findDuplicateCandidates(items: QuestionDraft[]): DuplicateCandidate[]`.

`ValidationResult = {ok: true, bundle: QuestionBundle} | {ok: false, errors: {path: string, code: string, message: string}[]}`.

`QuestionBundle = {schemaVersion: 1, batchId: string, items: QuestionDraft[]}`; IDs editoriais usam `MEDHELP-ENAMED-00001` a `MEDHELP-ENAMED-05000`; lote piloto `MEDHELP-ENAMED-001`; lotes seguintes `002` a `050`.

`QuestionDraft = {editorialId: string, version: number, area: 'clinica'|'cirurgia'|'pediatria'|'go'|'mfc_sc', topic: string, competency: {code: string, label: string, sourceUrl: string}, careContext: string, tags: string[], stem: string, leadIn: string, options: {id: 'A'|'B'|'C'|'D', text: string}[], answer: 'A'|'B'|'C'|'D', rationale: string, optionRationales: {A: string, B: string, C: string, D: string}, estimatedDifficulty: 'easy'|'medium'|'hard', learningObjective: string, references: {title: string, organization: string, editionDate: string, url: string, evidenceLocation: string, consultedAt: string}[], status: 'draft'|'checked', authorship: {actor: string, kind: 'assisted'|'human', recordedAt: string}, checks: {actor: string, kind: 'structural'|'editorial', version: number, recordedAt: string, outcome: 'pass'|'pending'|'reject', notes: string}[]}`.

O JSON importado nunca inclui `approved` ou `published`: aprovação e publicação só por transições administrativas auditadas. `checked` registra checagem editorial, não revisão médica.

### Task 1: Contrato, validação e relatório

**Files:** Create `scripts/questions/contracts.mjs`, `scripts/questions/contracts.test.mjs`, `scripts/questions/report.mjs`, `scripts/questions/report.test.mjs`; fixtures fictícias em `scripts/questions/fixtures/` sem afirmações médicas reais.

**Interfaces:** Produces contrato acima e `buildPilotReport(bundle: QuestionBundle): {countsByArea: Record<string,number>, countsByDifficulty: Record<string,number>, mentalHealthCount: number, exactDuplicates: string[][], duplicateCandidates: DuplicateCandidate[], distributionErrors: string[], states: Record<string,number>}`.

- [ ] Escrever teste: alternativa ausente, resposta E, explicação vazia, versão 0, ID repetido e referência vazia retornam `ok:false`; fixture completa retorna `ok:true`; documento excessivo (>100 itens/lote ou >5 MiB) é rejeitado.
- [ ] Executar `node --test scripts/questions/contracts.test.mjs`; observar falha pela ausência das funções.
- [ ] Implementar validação estrita e hash SHA256 do conteúdo sem trilha de checagem/estado. Rejeitar chaves desconhecidas; validar datas ISO e URLs HTTP(S), sem buscar URLs automaticamente no servidor de importação.
- [ ] Implementar comparação local: duplicata exata rejeitada; Jaccard de conjuntos de tokens normalizados de enunciado/comando ≥0,8 sinaliza par; mesmo tema/objetivo e alta semelhança também aparece no relatório. Sinalização não equivale a originalidade validada.
- [ ] Escrever teste de relatório: 100 fixtures balanceadas → total 100 e 10 marcadores `saude_mental`; 21/19 por área ou só 9 marcadores → `distributionErrors` não vazio. Troca apenas de nome/idade deve gerar candidato, nunca item aprovado automaticamente.
- [ ] Executar `node --test scripts/questions/*.test.mjs`; esperar zero falhas. Commit `feat: define private question bundle validation` incluindo somente scripts/fixtures fictícias.

### Task 2: Matriz e evidências para os 100 itens

**Files:** Create `docs/editorial/enamed-matrix-method.md` (método sem gabaritos); arquivos privados `MEDHELP-ENAMED-matriz-piloto.md` e `MEDHELP-ENAMED-fontes-piloto.json` entregues fora do Git público.

**Interfaces:** Consumes áreas e campos do contrato; produces exatamente 100 linhas de encomenda, cada uma `{editorialId, area, topic, competency, careContext, tags, estimatedDifficulty, learningObjective, verifiedReferences}`.

- [ ] Ler manual/matriz oficiais completos pelo link do portal e registrar edição/URL/data de consulta. Identificar os códigos reais usados; se não houver código oficial para uma competência, registrar rótulo exato e um identificador local explicitamente marcado como local, revisando o campo `code` sem atribuí-lo ao Inep.
- [ ] Preparar 20 encomendas por área com dificuldade 5/10/5 e ao menos 10 itens transversais de saúde mental. Diferenciar a decisão central de cada encomenda antes de escrever casos.
- [ ] Pesquisar referências primárias atuais por tema, abrindo a evidência e registrando localização. Fonte acessível sem evidência suficiente fica pendente; não substituir leitura por resultado de busca.
- [ ] Verificar contagem e cobertura contra tarefa 1; registrar conflitos de recomendações, abrangência territorial e validade temporal. Nenhuma encomenda sem evidência passa à redação como sustentada.
- [ ] Entregar matriz e índice de fontes privados; commit somente do método sem conteúdo protegido.

### Task 3: Autoria e checagem do lote piloto

**Files:** Private `MEDHELP-ENAMED-lote-001.json`, `MEDHELP-ENAMED-lote-001-revisao.md`, `MEDHELP-ENAMED-lote-001-relatorio.json`; método de revisão em `docs/editorial/enamed-review-checklist.md`.

**Interfaces:** Consumes encomendas tarefa 2; produces `QuestionBundle` schemaVersion 1, status inicial draft; Markdown mostra caso, quatro opções, resposta, explicação individual e referências de cada item.

- [ ] Redigir em cinco grupos de 20 conforme a matriz; casos fictícios, decisão específica, sem copiar fontes. Registrar autoria assistida de forma verdadeira.
- [ ] Validar cada grupo com `validateQuestionBundle`; corrigir estrutura antes de combinar lote. Não preencher campos apenas para satisfazer validador.
- [ ] Checar cada item contra a fonte aberta: contexto, gabarito, unidade, alternativa equivalente, contraindicação, distratores e localização da evidência. Se houver mais de uma resposta defensável, reescrever ou manter pendente.
- [ ] Executar relatório do lote e revisar todos os pares suspeitos; diferenças cosméticas não resolvem duplicação. Conferir referência existente sem evidência suficiente e recomendações em conflito (Review Focus).
- [ ] Registrar estado `checked` apenas para checagem assistida concluída, sem inventar revisor clínico. Relatório separa draft/checked; não aprovar/publicar sem o revisor designado.
- [ ] Persistir e entregar os três arquivos privados pelo mecanismo de arquivos disponível; não incluir os itens no repositório público. Informar contagens reais e pendências. Commit somente checklist e melhorias dos scripts.

### Task 4: Revisão clínica e expansão condicionada

**Files:** Create `docs/editorial/enamed-expansion-runbook.md`; registro privado de decisões e versões por lote.

**Interfaces:** Consumes piloto checado e banco administrativo do plano `2026-10-03-enamed-question-bank.md`; produces decisões auditadas e matriz de lotes 002–050, mantendo total 5.000.

- [ ] Entregar lote ao revisor qualificado designado pelo responsável; registrar identidade, qualificação, data e decisão item a item. Sem designação, encerrar entrega com itens privados pendentes, sem aguardar ficticiamente nem conceder aprovação automática.
- [ ] Incorporar correções, incrementar versões e repetir checagem. Registrar rejeições; validar o piloto antes da expansão.
- [ ] Preparar matriz cumulativa dos 49 lotes seguintes com objetivos diferentes; distribuir cada área até 1.000 itens e saúde mental transversal até pelo menos 500, sem dupla contagem.
- [ ] Para cada novo lote, repetir tarefas 2–3 e revisão clínica, comparando duplicatas com TODOS os lotes anteriores. Manter contadores produzidos/checados/aprovados/publicados e referências por versão.
- [ ] Publicar somente pela transição administrativa definida no plano do aplicativo; sem publicar JSON público, sem anunciar 5.000 antes de existirem 5.000 aprovadas e disponíveis.

## Handoff

Executar primeiro tarefas 1–3 deste plano para obter o piloto; o desenvolvimento do aplicativo pode usar fixtures fictícias enquanto a revisão clínica está pendente. Tarefa 4 é procedimento repetível de expansão, não uma promessa de trabalho em segundo plano. Revisar este plano e o plano técnico antes de iniciar execução.
