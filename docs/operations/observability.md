# Observabilidade e monitoramento de erros

`apps/web/instrumentation.ts` registra `onRequestError`, chamado pelo Next.js sempre que o servidor captura um erro de renderização, rota ou server action. Hoje ele delega para `apps/web/lib/observability/logger.ts`, que:

- Monta um evento estruturado (`timestamp`, `message`, `digest`, `request.path`, `request.method`, `context.routerKind/routePath/routeType`);
- Faz uma redação defensiva de qualquer trecho que pareça senha, token, segredo ou chave de API antes de logar a mensagem;
- Nunca inclui headers, cookies ou corpo da requisição — apenas caminho e método, conforme a política de logs da especificação (seção 15: "Logs sem senhas, tokens, dados de cartão ou conteúdo pessoal desnecessário");
- Escreve uma única linha JSON em `console.error` (stderr), que a Vercel (e qualquer host Node) já coleta como log de função sem configuração adicional;
- Nunca lança: falha ao logar não pode afetar a resposta da requisição.

## Estado atual

Nenhum SaaS de observabilidade está integrado de verdade. Não há `@sentry/nextjs` nem qualquer SDK de APM instalado — isso evita adicionar uma dependência paga e credenciais fictícias ao repositório. O logger estruturado acima já é um ganho real: toda falha de servidor fica registrada de forma consistente e buscável nos logs da plataforma.

## Como conectar um provedor real (Sentry, conforme a seção 13 da spec)

1. Crie um projeto Sentry para a MEDHELP e gere um DSN de servidor.
2. Adicione `SENTRY_DSN` apenas nas variáveis de ambiente protegidas do provedor de hospedagem (painel da Vercel → Settings → Environment Variables). **Nunca** commit o valor real; `.env.example` só documenta o nome da variável, vazio.
3. Instale `@sentry/nextjs` (`pnpm --filter @medhelp/web add @sentry/nextjs`) e siga o wizard oficial, ou registre manualmente em `apps/web/instrumentation.ts`:
   ```ts
   import * as Sentry from '@sentry/nextjs';

   export function register(): void {
     if (process.env.SENTRY_DSN) {
       Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
     }
   }
   ```
4. Dentro de `onRequestError` (ou do próprio `lib/observability/logger.ts`), encaminhe o evento já redigido para `Sentry.captureException(error, { extra: event })` quando `process.env.SENTRY_DSN` estiver definido — o ponto de extensão já existe em `logServerError` com um comentário indicando onde isso entra.
5. Confirme no painel do Sentry que erros de produção aparecem com o `digest` do Next.js, o que facilita cruzar um evento do Sentry com uma mensagem genérica mostrada ao usuário.

## Limitações conhecidas

- O rate limiting em `apps/web/lib/security/rate-limit.ts` usa um contador em memória por instância do processo. Em uma implantação com múltiplas instâncias simultâneas (ex.: várias funções serverless atendendo a região ao mesmo tempo), o limite efetivo pode ser maior que o configurado sob carga concorrente alta. Se isso se tornar um problema real, trocar o `Map` interno por um store compartilhado (Redis/Upstash) resolve sem mudar a API pública do módulo (`checkRateLimit`, `enforceRateLimit`).
- Sem Sentry real conectado, não há agregação de erros, alertas ou rastreamento de performance — apenas logs estruturados nos registros da função.
