# Integração do ciclo básico — operação segura

## Atualização operacional — 3 de outubro de 2026

PRs #3 e #4 integrados em main. Em 3 de outubro de 2026, o lote `7b2b6678-515c-478d-83be-78cc78f710ee` foi importado e publicado pela sessão real do administrador. Produção confirmada: 12 disciplinas, 72 módulos, 83 aulas premium publicadas e 83 blocos ativos, sem aulas pendentes no lote. Acervo: `4daf7a7613e48cf09607a1628a890f656a551dfe4d6df47da4976bae610ab4ad`.

- Primeira simulação: 83 inclusões, zero alterações e zero conflitos. Após aplicação: 83 sem alteração, zero novas aulas.
- Todos os 83 textos em produção conferidos por SHA-256 contra o pacote compilado, incluindo tipo, formato e posição de bloco. Amostras CH-01-A1, EB-04-A1 e EG-01-A1 preservam referências e tabelas.
- Catálogo real do aluno exibe 83 aulas. API anônima permite os metadados publicados, mas não retorna blocos premium nem acesso aos lotes/vínculos. Leitor do aluno sem assinatura exibe apenas a prévia, não o texto premium.
- Progresso e favoritos preservados: contagens e fingerprints antes/depois iguais (ambos vazios nesta primeira importação).
- Migration local `20261001195840_content_import.sql` aplicada pelo conector em produção como `20261003205601_content_import`; invocador, search_path vazio, RLS ativo e sem EXECUTE para anon. Não reaplicar a mesma SQL sob outro timestamp.
- Testes descartáveis anteriores: 17 compilador/CLI, 88 pgTAP e 16 navegador. Compilador/CLI 17/17 repetidos antes desta operação.

Backup alternativo sem custo: captura lógica das cinco tabelas do catálogo, com colunas, defaults, constraints, enums e dados. Restaurada em PostgreSQL isolado via PGlite 0.5.8; igualdade JSON exata de todos os registros confirmada em UTC. Snapshot SHA-256 `e9254cb40572e9209acb34a0236c394c282d3cf066c9c8f0659ddc37d80cd2aa`. Arquivo entregue: `MEDHELP-backup-catalogo-2026-10-03.zip`.

Decisão operacional: aceitar esse backup **limitado ao catálogo** para esta primeira importação aditiva, pois havia somente três ciclos seedados e nenhuma aula/disciplina/módulo/bloco. Não é backup completo de Auth, pagamentos, mídia ou plataforma; políticas, funções e triggers continuam nas migrations versionadas, não no ensaio de restauração de dados. Não houve reset remoto, exclusão, alteração de cobrança ou extração de credenciais. Para futuras operações destrutivas ou recuperação completa, continua necessário um backup completo adequado.

O painel `/editor/conteudos/importar` acrescenta um transporte autenticado para as mesmas RPCs. Editor/admin seleciona o JSON compilado (até 500 KB), simula e importa usando a impressão conferida. Após revisar as aulas, simula novamente e publica separadamente o lote original. Nenhuma credencial é extraída do navegador e nenhum conteúdo é incluído no bundle público. Mensagens operacionais são resultados estruturados, pois Next.js omite mensagens de exceções de servidor em produção.

O identificador do lote permanece apenas na tela atual: conserve-o para recuperação por RPC se houver navegação ou perda da resposta. O lote original desta publicação está registrado acima. Os procedimentos abaixo preservam o histórico de implementação e orientam novas operações; suas declarações antigas de produção pendente foram superadas pelo relatório acima.

## Estado da entrega inicial — histórico

Compilador e leitor entregues em `main` por PR #2. Importação e testes de banco/jornada na branch `codex/basic-cycle-db-import`, base `bb34bc9`.

- Compilador: 83 aulas, 72 módulos, 12 disciplinas; IDs editoriais preservados.
- Conteúdo introdutório. A validação informada pelo proprietário não equivale a certificação médica especializada.
- Leitor: formatação opt-in `medhelp-markdown-v1`, tabelas, listas, referências HTTP(S), texto HTML escapado e compatibilidade com blocos antigos.
- Catálogo: ciclo → disciplina → módulo → aula, mantendo indicação de acesso e conclusão.
- Testes: 12 do compilador e 88 da aplicação/domínio aprovados. Lint e typecheck aprovados.
- Build Next.js confirmado diretamente com `node node_modules/next/dist/bin/next build` em `apps/web`.
- Nenhuma importação, migration, publicação, alteração de pagamento ou escrita em banco remoto realizada.

## Compilar sem acesso ao banco

Na raiz do repositório:

```sh
node --test scripts/content/compile.test.mjs
node scripts/content/compile.mjs --output /caminho/privado/novo-bundle.json
```

O diretório de destino deve existir e o arquivo não pode existir. O compilador recusa sobrescrita. Não use `apps/web/public` nem inclua o pacote no bundle do navegador: contém aulas premium.

Hash do acervo validado nesta entrega:

```text
4daf7a7613e48cf09607a1628a890f656a551dfe4d6df47da4976bae610ab4ad
```

O hash identifica os metadados e blocos normalizados; não comprova revisão clínica nem publicação. Alterações editoriais exigem nova compilação e conferência.

Revisão independente encontrou bibliografias omitidas em 11 aulas que usam os títulos `Fontes` e `Referências`. Corrigido com dois testes de regressão (preservação das fontes e mudança de hash), observados falhando antes da correção e aprovados depois. Nenhuma outra ressalva de código foi apontada; testes reais de banco e jornada continuam pendentes.

## Ambiente de testes sem serviço pago

O workflow `.github/workflows/database-tests.yml` utiliza runner padrão Ubuntu do GitHub Actions no repositório público e Supabase local descartável. Não provisiona branch Supabase paga, não recebe credenciais de produção, não envia artifacts e não usa cache persistente. O container é encerrado mesmo após falha. A gratuidade depende de manter as condições do plano GitHub; revisar antes de tornar o repositório privado ou mudar o runner.

Em uma máquina com Docker, Node 24 e pnpm 10.19.0, os mesmos testes podem ser executados com `pnpm exec supabase start`, `pnpm exec supabase test db` e `node scripts/content/ci-journey.mjs`. O último é exclusivamente de teste: aceita apenas o endpoint local `127.0.0.1:54321`, obtém chaves do CLI local e usa contas sintéticas. Nunca adaptar esse driver para produção.

As RPCs são `preview_content_import`, `apply_content_import` e `publish_content_import`. Todas executam como invocador, exigem usuário editor/admin e respeitam RLS. Alunos não podem ler cópias de conteúdo nas tabelas de lotes. Uma impressão SHA-256 calculada no banco detecta edições manuais, inclusive alterações de blocos, acesso, estado editorial e exclusão lógica. O hash de origem informado pelo cliente não substitui essa conferência.

## Simular e importar para review

1. Confirmar projeto `uikzqfwqvmracuvwdabb`, migrations e testes aprovados no commit escolhido.
2. Exportar um backup lógico com a ferramenta de backup disponível ao proprietário, verificar sua restauração em ambiente isolado e guardar o relatório fora do repositório. Não presumir backup automático do plano Free.
3. Aplicar a migration versionada `20261001195840_content_import.sql` pelo fluxo autorizado de migrations, sem reset remoto.
4. Configurar por canal seguro as variáveis `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `MEDHELP_ADMIN_ACCESS_TOKEN`, sendo esta última uma sessão real e vigente de editor/admin. Não colar token em conversa, git, logs ou argumentos do shell. A conexão de gerenciamento do Supabase não equivale a uma sessão da aplicação.
5. Compilar o pacote em diretório privado. Executar a simulação:

```sh
node scripts/content/import.mjs --bundle /caminho/privado/novo-bundle.json
```

Na primeira importação: `create: 83`, `update: 0`, `unchanged: 0`, `conflicts: []`. Conferir o digest e guardar o `expectedState` (não é uma credencial). Aplicar explicitamente:

```sh
node scripts/content/import.mjs --bundle /caminho/privado/novo-bundle.json --apply --expected-state IMPRESSAO_DE_64_CARACTERES_DA_SIMULACAO
```

O resultado deve informar um `batchId`. As aulas novas ficam premium e em `review`, não visíveis como aulas publicadas para o aluno. Repetir a simulação deve retornar `unchanged: 83`, sem duplicações. Conferir amostras EG-01, EB-04 e CH-01, incluindo referências e tabela.

## Conflitos e publicação separada

- `40001`: o catálogo mudou ou houve conflito editorial. Não repetir automaticamente com uma impressão nova: examinar `conflicts` e reconciliar a edição.
- Um slug de aula existente sem vínculo editorial nunca é adotado. Aulas gratuitas vinculadas preservam `free` nas atualizações.
- Aulas publicadas/arquivadas com conteúdo diferente são bloqueadas. Alterações de títulos compartilhados de módulo/disciplina exigem reconciliação editorial, não reescrita automática.
- Toda aplicação é uma transação. Nenhuma aula, favorito ou progresso é excluído; blocos substituídos ficam com exclusão lógica.
- A importação bloqueia brevemente escritas no catálogo para evitar corridas com o editor; leituras continuam disponíveis. O token é conservador e também invalida após alterações fora do lote.
- Após conferência e autorização explícita, uma sessão editorial chama `publish_content_import` com `batch_id` e o `expected_state` da simulação atual. O lote inteiro deve manter as impressões registradas e estar em `review`; em qualquer conflito, nada é publicado. A repetição do mesmo pedido de publicação é idempotente enquanto o lote permanece inalterado.
- Uma nova importação idêntica de aulas já publicadas é permitida, mas não é um novo pedido de publicação. Use o identificador original para repetir uma publicação.
- Não há token administrativo configurado nesta entrega e a conexão de gerenciamento não tem `auth.uid()`. A execução em produção deve permanecer pendente até haver uma sessão autorizada; não forjar JWT, assumir usuário ou usar `service_role` para contornar essa exigência.

## Condições para produção (não executadas)

1. Suíte de banco e jornada completas em ambiente descartável.
2. Backup verificado do banco correto e sessão administrativa autorizada por meio configurado; não usar credenciais privilegiadas para contornar permissões.
3. Simulação com relatório de inclusões, alterações, conflitos e fingerprint esperado.
4. Aplicação transacional para `review`, preservando IDs, aulas gratuitas e dados de aprendizagem.
5. Conferência de contagens, amostras, referências e acesso; publicação separada e atômica do lote.
6. Repetição da simulação sem novas inclusões. Em falha, não excluir aulas ou progresso; retirada posterior exige arquivamento editorial autorizado.

Pagamentos permanecem fora desta entrega: um mês sem parcelamento; compra de vários meses poderá permitir parcelas em integração posterior.
