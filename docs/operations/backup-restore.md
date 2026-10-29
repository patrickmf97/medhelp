# Backup e restauração — MEDHELP

Este runbook cobre os dois armazenamentos reais da plataforma hoje: o banco Postgres hospedado
no projeto Supabase `uikzqfwqvmracuvwdabb` (schema `public`, incluindo `auth.users` gerido pelo
Supabase Auth) e o bucket privado `medhelp-media` na Cloudflare R2 (ver `docs/operations/r2-media.md`).
Não há cobrança (Mercado Pago) nem Sentry integrados na plataforma ainda; quando existirem,
este documento precisa ganhar uma seção própria para cada um antes do lançamento.

## O que precisa de backup

- **Banco de dados** (prioridade máxima): todas as tabelas de identidade (`profiles`, `roles`,
  `user_roles`, `legal_acceptances`, `audit_logs`), conteúdo (`cycles`, `disciplines`, `modules`,
  `lessons`, `lesson_blocks`, `attachments`, `summaries`, `content_relations`, `tags`,
  `content_tags`), aprendizagem (`lesson_progress`, `favorites`, `flashcard_decks`, `flashcards`,
  `flashcard_reviews`, `questions`, `question_options`, `quiz_attempts`, `quiz_answers`,
  `study_streaks`) e o schema `auth` (contas, senhas com hash, identidades). As migrations em
  `supabase/migrations/` recriam estrutura, políticas RLS, funções e triggers a partir do zero;
  elas **não** substituem backup de dados, só de schema.
- **Mídia privada**: objetos do bucket R2 `medhelp-media`, referenciados por `attachments.object_key`
  no padrão `content/<slug>/<arquivo>`. Perder o bucket sem backup quebra os anexos já publicados
  mesmo que o banco esteja intacto.
- **Fora de escopo deste documento, porque ainda não existem em produção**: dados de cobrança
  (Mercado Pago), eventos do Sentry. Trate como pendência de produto antes do lançamento cobrar
  qualquer assinatura real.

## Backup do banco (produção)

O projeto roda hoje no plano gratuito do Supabase: **não há point-in-time recovery nem backup
diário automático garantido** nesse plano (PITR e backups agendados são recursos do plano Pro ou
superior). Enquanto o projeto não migrar de plano, o backup lógico abaixo é a única rede de
segurança real e deve ser feito manualmente antes de qualquer migration destrutiva, reset ou
operação administrativa de risco — exatamente como já foi feito antes da importação descrita em
`docs/operations/basic-cycle-import.md`.

1. Confirme o projeto correto antes de rodar qualquer comando com credenciais reais:

```sh
pnpm exec supabase projects list
pnpm exec supabase link --project-ref uikzqfwqvmracuvwdabb
```

2. Gere o dump lógico completo usando a string de conexão do painel **Project Settings →
   Database → Connection string** (modo `session`, porta 5432). Nunca cole a senha em um argumento
   de shell que fique no histórico; prefira a variável de ambiente. `supabase db dump` **sem**
   `--data-only` gera só o schema (DDL); para um backup real de dados são necessários os dois
   comandos, e `--schema public,auth` é obrigatório porque o padrão da CLI exclui o schema `auth`
   (ele é tratado como "interno da plataforma", mas é exatamente onde ficam as contas de usuário):

```sh
export MEDHELP_BACKUP_DB_URL="postgresql://postgres:<senha>@<host>:5432/postgres"
STAMP="$(date +%Y%m%d%H%M)"
pnpm exec supabase db dump --db-url "$MEDHELP_BACKUP_DB_URL" --schema public,auth -f "medhelp-schema-$STAMP.sql"
pnpm exec supabase db dump --db-url "$MEDHELP_BACKUP_DB_URL" --schema public,auth --data-only -f "medhelp-data-$STAMP.sql"
```

3. Guarde os dois arquivos fora do repositório (nunca commitar um dump: o de dados contém
   informação pessoal e hashes de senha). Calcule e registre o SHA-256 de cada um para conferência
   futura:

```sh
sha256sum "medhelp-schema-$STAMP.sql" "medhelp-data-$STAMP.sql"
```

4. Para um backup mais barato e frequente só do catálogo (sem `auth`, sem progresso do aluno),
   quando o objetivo é apenas proteger conteúdo editorial antes de uma importação, use
   `--data-only` com a lista de tabelas de conteúdo, como já foi feito na operação registrada em
   `docs/operations/basic-cycle-import.md`. Isso **não** é um backup completo e não deve ser usado
   como tal fora desse cenário específico.

## Restauração do banco

**Nunca restaure diretamente sobre o projeto de produção sem aprovação explícita do Patrick.** A
sequência segura é:

1. Restaurar em um ambiente isolado e descartável primeiro:

```sh
pnpm exec supabase start -x realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f medhelp-schema-AAAAMMDDHHMM.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f medhelp-data-AAAAMMDDHHMM.sql
```

A instância local já aplica as migrations versionadas ao subir (schema de `public`); o
`medhelp-schema-*.sql` restaurado é o que garante que o schema `auth` também exista com a mesma
estrutura antes de inserir os dados de `medhelp-data-*.sql`.

2. Conferir contagens de linhas das tabelas críticas, uma amostra de conteúdo publicado e que
   `auth.users` restaurou com os mesmos emails/ids, antes de considerar o backup válido.
3. Só então, se a restauração for mesmo necessária em produção (perda de dados real, não um
   ensaio), coordenar com o Supabase Support ou usar o dump validado via `psql` contra a connection
   string de produção, em uma janela de manutenção comunicada, com o site em modo de leitura
   quando possível.
4. Depois de qualquer restauração em produção, rode `pnpm exec supabase test db` contra o projeto
   restaurado (ou uma cópia) para confirmar que RLS, funções e triggers continuam coerentes com o
   estado esperado pelas migrations.

## Backup e restauração da mídia (Cloudflare R2)

O bucket `medhelp-media` é privado e não tem versionamento nem snapshot nativo no plano atual da
R2. O backup é uma cópia explícita para um segundo local, usando qualquer cliente compatível com
S3 (por exemplo `aws s3 sync` ou `rclone`) apontando para o endpoint da R2
(`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`):

```sh
aws s3 sync s3://medhelp-media ./medhelp-media-backup-$(date +%Y%m%d) \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --profile medhelp-r2-readonly
```

Use uma credencial R2 **somente leitura** dedicada a esse backup (configurada como perfil separado
do `aws`), nunca as credenciais `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` de escrita usadas pela
aplicação. Para restaurar, faça o `sync` no sentido inverso contra o bucket de produção, ou, se o
bucket original ainda existir parcialmente, copie apenas os objetos ausentes (compare as listagens
antes de sobrescrever nada).

## O que ainda não está automatizado (pendência real, não decisão de produto)

Hoje o backup é manual e depende de alguém lembrar de rodá-lo. Antes do lançamento, decidir e
implementar pelo menos um dos dois abaixo é recomendado, mas fica fora do escopo desta tarefa
porque depende de custo/infra que só o Patrick pode aprovar:

- Migrar o projeto Supabase para um plano com backups diários automáticos e PITR; ou
- Agendar o dump lógico (passo "Backup do banco" acima) em um job do GitHub Actions com
  `workflow_dispatch`/`schedule`, enviando o arquivo para um storage próprio (não para o
  repositório). Isso exigiria guardar a connection string de produção como secret do repositório,
  o que é uma decisão de segurança que também precisa de aprovação explícita antes de existir.

## Teste de restauração mais recente

Ver `docs/operations/basic-cycle-import.md`, seção "Atualização operacional — 3 de outubro de
2026": restauração do catálogo (cinco tabelas de conteúdo) validada em Postgres isolado via PGlite,
com igualdade JSON exata dos registros confirmada. Esse teste cobriu apenas o catálogo, não
`auth`, pagamentos ou mídia; repita o procedimento completo deste documento antes de confiar nele
para uma recuperação real de produção.
