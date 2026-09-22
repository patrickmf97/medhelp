# PROMPT 01 — MEDHELP: fundação, site público e autenticação

Você é o engenheiro responsável por implementar o primeiro bloco completo da plataforma MEDHELP. Trabalhe diretamente no projeto disponível no ambiente. Não entregue apenas explicações ou exemplos: inspecione o diretório, crie ou altere os arquivos necessários, execute os testes e deixe o bloco funcional.

Não peça esclarecimentos sobre decisões já definidas neste prompt. Se encontrar uma decisão técnica secundária não especificada, escolha a alternativa mais simples, segura e compatível com a arquitetura, registre-a no relatório final e prossiga. Pare apenas se existir um bloqueio externo real que impossibilite continuar.

## 1. OBJETIVO

Entregar a fundação executável da MEDHELP, incluindo:

1. Monorepo, aplicação Next.js e ferramentas de qualidade;
2. Contratos de domínio para papéis e acesso por assinatura;
3. Base Supabase com perfis, papéis, assinatura, aceite legal e auditoria;
4. Row Level Security com negação por padrão;
5. Design system clínico premium;
6. Página pública completa e responsiva;
7. Cadastro, confirmação de e-mail, login, logout e recuperação de senha;
8. Proteção de rotas de aluno, editor e administrador;
9. Testes unitários, de banco, componentes e fluxos críticos.

Ao terminar, a aplicação deverá iniciar localmente, compilar e possuir uma base segura para os próximos módulos. Não implemente ainda catálogo acadêmico, aulas, flashcards, questões, biblioteca, pagamentos ou o Atlas 3D real.

## 2. CONTEXTO DO PROJETO

### Produto

MEDHELP é uma plataforma de apoio para estudantes de medicina. O produto completo reunirá resumos, aulas, flashcards, questões, ebooks gratuitos e um Atlas 3D. A assinatura custará R$ 30 por mês.

Posicionamento: clínico premium, confiável, moderno, visual e acolhedor.

Chamada principal obrigatória:

> Medicina é difícil. Estudar não precisa ser.

Subtítulo obrigatório:

> Resumos, flashcards, biblioteca acadêmica e um Atlas 3D interativo reunidos em uma plataforma criada para acompanhar toda a sua formação médica.

### Stack obrigatória

- Node.js 22;
- pnpm 10;
- TypeScript em modo estrito;
- Monorepo com pnpm workspaces e Turborepo;
- Next.js App Router;
- React;
- Tailwind CSS;
- Supabase PostgreSQL, Auth e RLS;
- Vitest e Testing Library;
- Playwright;
- ESLint;
- Vercel como destino futuro de deploy.

Fixe as versões resolvidas no `pnpm-lock.yaml`. Não use dependências flutuantes depois do bootstrap.

### Documentos de referência

Se estes arquivos existirem no projeto, leia-os antes de alterar código e trate-os como fonte oficial:

- `docs/superpowers/specs/2026-09-22-medhelp-design.md`
- `docs/superpowers/plans/2026-09-22-medhelp-platform.md`

Em caso de divergência, a especificação tem prioridade sobre o plano, e este prompt define o recorte que deve ser implementado agora.

### Estrutura esperada

```text
apps/
  web/
packages/
  domain/
  ui/
  atlas-contract/
supabase/
  migrations/
  tests/
docs/
```

Mantenha arquivos pequenos e focados. Rotas devem orquestrar serviços, não conter algoritmos de domínio.

## 3. ESTADO INICIAL E CONDUTA

1. Inspecione primeiro os arquivos existentes, o estado do Git e quaisquer instruções locais do projeto.
2. Preserve alterações existentes e não relacionadas.
3. Se o projeto estiver vazio, faça o bootstrap na estrutura acima.
4. Se já houver implementação parcial, aproveite o que estiver correto e adapte sem duplicar módulos.
5. Crie `.env.example` apenas com nomes de variáveis e comentários seguros. Nunca grave tokens ou segredos reais.
6. Se as credenciais externas ainda não existirem, deixe a integração pronta e testável por mocks ou Supabase local; não transforme a ausência de credenciais em motivo para abandonar o restante do bloco.
7. Se houver Git, produza commits atômicos. Se o diretório ainda não for um repositório, inicialize-o localmente. Não faça push nem publique deploy.

## 4. ESCOPO DETALHADO

### A. Bootstrap e qualidade

Crie o workspace, pacotes e aplicação com comandos funcionais:

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`

Configure TypeScript estrito, aliases consistentes, Vitest, Testing Library e Playwright. Adicione um smoke test que fixe:

- Nome `MEDHELP`;
- Preço mensal em centavos igual a `3000`;
- Headline exatamente igual à aprovada.

### B. Domínio de papéis e assinatura

No pacote `packages/domain`, crie tipos e função pura para decisão de acesso.

Papéis públicos:

- `student`;
- `editor`;
- `admin`.

Estados de assinatura:

- `pending`;
- `active`;
- `grace`;
- `expired`;
- `canceled`;
- `refunded`.

Exponha contrato equivalente a:

```ts
type AccessInput = {
  state: 'pending' | 'active' | 'grace' | 'expired' | 'canceled' | 'refunded';
  accessUntil: string | null;
};

type AccessDecision = {
  canAccessPremium: boolean;
  reason: 'active' | 'grace_period' | 'paid_period' | 'pending' | 'expired' | 'refunded';
};

function evaluateAccess(input: AccessInput, now: Date): AccessDecision;
```

Regras:

- `active` permite acesso enquanto válido;
- `grace` permite acesso até `accessUntil`;
- assinatura cancelada mantém acesso até o final do período já pago;
- `expired` e `refunded` bloqueiam acesso premium;
- datas inválidas ou ausentes em estados que exigem data falham de maneira segura;
- use comparação de datas em UTC;
- cubra todas as transições com testes.

### C. Banco, papéis e RLS

Crie migração versionada para:

- `profiles`;
- `roles`;
- `user_roles`;
- `subscriptions`;
- `access_grants`;
- `legal_acceptances`;
- `audit_logs`.

Requisitos mínimos:

- Tipos enumerados coerentes com o domínio;
- Chaves estrangeiras e índices;
- Timestamps;
- Trigger controlado de `updated_at`;
- Criação segura de perfil após cadastro;
- RLS ativado em todas as tabelas privadas;
- Usuário acessa somente o próprio perfil e dados permitidos;
- Editor não acessa cobrança, papéis ou concessões de acesso;
- Administrador possui acesso administrativo explicitamente definido;
- Nenhuma política usa metadado do cliente como prova de autorização;
- Funções `security definer`, se indispensáveis, devem fixar `search_path` e ter permissões mínimas.

Crie testes pgTAP ou equivalentes que comprovem:

1. Anônimo não lista perfis;
2. Aluno lê e atualiza somente campos permitidos do próprio perfil;
3. Aluno não concede papel nem acesso;
4. Editor não acessa faturamento ou papéis;
5. Administrador autorizado realiza as operações previstas;
6. Negação por padrão continua valendo para casos não explicitados.

Crie factories Supabase separadas para servidor e cliente, compatíveis com autenticação SSR por cookies.

### D. Design system clínico premium

Crie componentes reutilizáveis no pacote `packages/ui`:

- Button;
- Card;
- Field;
- Badge;
- Dialog;
- Spinner ou estado de carregamento;
- Mensagem de erro acessível.

Direção visual obrigatória:

- Azul-marinho profundo: `#0B1F3A`;
- Verde-esmeralda: `#16A085`;
- Fundo claro próximo de `#F6F8FB`;
- Texto escuro próximo de `#102033`;
- Tipografia moderna e legível;
- Sombras discretas e cantos moderados;
- Contraste WCAG 2.2 AA;
- Foco visível;
- Suporte a `prefers-reduced-motion`;
- Mobile-first.

Crie um logo SVG acessível com:

- Cruz médica formada por páginas de um livro aberto;
- Nome `MEDHELP` em caixa alta;
- Versão horizontal para cabeçalho;
- Versão compacta para favicon/ícone.

Não use estetoscópio ou linha de eletrocardiograma como símbolo principal.

### E. Site público

Implemente uma página pública completa com:

1. Cabeçalho com logo, Recursos, Atlas 3D, Disciplinas, Biblioteca, Preço, FAQ, Entrar e Começar agora;
2. Hero com título e subtítulo aprovados;
3. Botão principal `Começar agora`, levando a `/cadastro`;
4. Botão secundário `Explorar gratuitamente`, levando a `/explorar`;
5. Preço visível na primeira dobra como `R$ 30/mês`;
6. Seção de ferramentas;
7. Seção de demonstração do Atlas;
8. Organização por ciclos Básico, Clínico e Internato;
9. Benefícios para a rotina de estudos;
10. Conteúdos gratuitos;
11. Plano único;
12. FAQ;
13. CTA final;
14. Rodapé com links funcionais e páginas iniciais de contato, termos, privacidade, créditos e licenças, usando somente informações já aprovadas e aviso de revisão jurídica antes do lançamento.

O Atlas real não será implementado neste bloco. Para a seção visual, crie uma composição anatômica leve e proposital em SVG/CSS, claramente tratada como prévia visual. Isole-a no componente `atlas-demo.tsx`, para substituição futura sem reescrever o hero.

Requisitos:

- Aparência clínica premium, não hospitalar nem genérica;
- Sem lorem ipsum;
- Copy completa em português brasileiro;
- Menu móvel acessível;
- Layout testado em larguras pequenas, médias e grandes;
- Metadados básicos de título e descrição;
- Elementos interativos acessíveis por teclado.

### F. Autenticação e rotas protegidas

Implemente:

- `/entrar`;
- `/cadastro`;
- `/recuperar-senha`;
- `/redefinir-senha`;
- `/auth/callback`;
- Logout;
- Shell protegido `/aluno`;
- Shell protegido `/admin`;
- Página `/acesso-negado`.

Regras:

- Cadastro com nome, e-mail e senha;
- Senha com mínimo de 10 caracteres;
- Confirmação de e-mail;
- Recuperação e redefinição seguras;
- Aceite versionado de termos e privacidade durante cadastro;
- Mensagens de erro não podem revelar se um e-mail está cadastrado;
- Usuário não autenticado é redirecionado para login preservando destino seguro;
- Aluno não entra em `/admin`;
- Editor entra apenas nas futuras áreas de conteúdo, não em cobrança ou papéis;
- Admin acessa shell administrativo;
- Não confie somente em middleware: valide autorização novamente no servidor;
- Evite open redirect na URL de retorno.

Crie o shell visual da área do aluno e do admin, mas não implemente ainda os módulos internos. O shell deve ter navegação, estado vazio bem desenhado e indicar claramente que os conteúdos serão adicionados nos próximos blocos.

## 5. RESTRIÇÕES E REQUISITOS NÃO FUNCIONAIS

- Não implemente Mercado Pago, Cloudflare R2 real, Resend, flashcards, questões, ebooks ou visualizador Three.js neste bloco.
- Não crie microserviços.
- Não introduza Redux se estado local/servidor for suficiente.
- Não armazene senha, token, segredo ou credencial no repositório.
- Não desative RLS para facilitar desenvolvimento.
- Não use `any` sem justificativa técnica registrada.
- Não silencie erros de TypeScript ou lint.
- Não faça chamadas externas nos testes unitários.
- Use validação compartilhada com Zod nos formulários e ações de servidor.
- Componentes de servidor são o padrão; use cliente apenas quando houver interação real.
- Registre erros de forma segura, sem dados pessoais ou credenciais.
- Preserve histórico e mudanças existentes no repositório.

## 6. CRITÉRIOS DE ACEITE

Considere este bloco concluído somente se:

1. `pnpm install` e os scripts definidos funcionarem em checkout limpo;
2. `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` terminarem sem erro;
3. Os testes E2E públicos e de autenticação passarem em ambiente configurado;
4. A home exibir headline, subtítulo, `R$ 30/mês` e CTAs corretos;
5. A navegação funcionar em desktop e celular;
6. Cadastro, confirmação, login, logout e recuperação estiverem implementados;
7. As proteções de `/aluno` e `/admin` forem verificadas no servidor;
8. A matriz aluno/editor/admin estiver coberta por testes;
9. RLS negar acesso não autorizado em testes do banco;
10. O domínio de assinatura tratar todos os estados de forma exaustiva;
11. Nenhum segredo real estiver versionado;
12. Não houver conteúdo fictício, links sem destino ou erros de console na home;
13. Foco, contraste, teclado e redução de movimento forem verificados;
14. O projeto estiver pronto para receber o bloco de catálogo e administração de conteúdo.

Se Supabase local ou navegador Playwright não puderem executar por limitação objetiva do ambiente, ainda crie toda a configuração e testes. No relatório final, informe exatamente o comando tentado, o erro recebido e o que permanece não verificado. Não declare que passou.

## 7. MÉTODO DE TRABALHO

Siga esta ordem:

1. Inspeção do projeto;
2. Bootstrap e teste de fumaça;
3. Domínio de acesso com TDD;
4. Banco e RLS com testes;
5. Design system;
6. Site público;
7. Autenticação e proteção de rotas;
8. Verificação transversal;
9. Commits atômicos.

Para cada etapa:

- Escreva primeiro o teste relevante;
- Execute-o e confirme que falha pela razão esperada;
- Implemente o mínimo necessário;
- Execute novamente;
- Faça a revisão antes de avançar.

Não interrompa o bloco para pedir aprovação intermediária. Continue até cumprir os critérios ou encontrar um bloqueio externo real.

## 8. SAÍDA ESPERADA

Ao finalizar, responda com:

1. Resumo objetivo do que foi implementado;
2. Lista de arquivos e módulos principais criados ou alterados;
3. Migrações e políticas de segurança adicionadas;
4. Testes executados, com comandos e resultados reais;
5. Decisões técnicas secundárias tomadas;
6. Variáveis que o responsável deverá preencher em `.env.local`;
7. Bloqueios ou verificações não executadas, sem ocultar falhas;
8. Hashes e mensagens dos commits criados;
9. Confirmação explícita de que não houve push nem deploy;
10. Estado de prontidão para o próximo bloco: catálogo acadêmico e painel editorial.

Não apenas descreva código. Implemente, teste e entregue o repositório no estado solicitado.
