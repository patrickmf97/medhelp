# MEDHELP — Especificação funcional e técnica

**Versão:** 1.0  
**Data:** 22 de setembro de 2026  
**Status:** aguardando aprovação final  
**Responsável pelo produto:** Patrick Morais Ferreira

## 1. Visão do produto

MEDHELP será uma plataforma web por assinatura para apoiar estudantes de medicina ao longo da graduação. O produto reunirá conteúdos acadêmicos, resumos, aulas, flashcards com revisão espaçada, questões, biblioteca de ebooks gratuitos e um Atlas 3D de anatomia dentro de uma experiência única.

A proposta central é reduzir a fragmentação da rotina de estudos. Em vez de o estudante alternar entre diferentes aplicativos e fontes, ele encontrará conteúdo, revisão, prática e exploração anatômica no mesmo ambiente.

**Posicionamento:** plataforma clínica premium, confiável, moderna, visual e acolhedora.  
**Chamada principal:** “Medicina é difícil. Estudar não precisa ser.”  
**Preço inicial:** R$ 30 por mês.  
**Público inicial:** estudantes de medicina no Brasil.  
**Publicação de conteúdo no lançamento:** apenas equipe interna MEDHELP.

O produto não substitui orientação médica, material oficial das instituições de ensino ou validação por especialistas. Todo conteúdo clínico e anatômico deverá passar por revisão humana antes da publicação.

## 2. Escopo e decomposição

O projeto será tratado como dois subprodutos integrados:

1. **Plataforma MEDHELP:** site público, autenticação, assinatura, área do aluno, conteúdo, progresso, biblioteca, flashcards, questões e administração.
2. **Atlas MEDHELP 3D:** pipeline de ativos anatômicos, visualizador WebGL, busca, organização das estruturas e integração educacional.

A plataforma seguirá arquitetura de monólito modular. O Atlas terá fronteira própria dentro do monorepo e contrato de integração estável, para ser desenvolvido e testado separadamente sem duplicar autenticação, pagamentos ou gestão de conteúdo.

### Fora do escopo inicial

- Marketplace de cursos;
- Perfil e painel para professores convidados;
- Comissionamento ou repasse de receita;
- Aplicativos nativos para Android e iOS;
- Conteúdo anatômico feminino ou variações anatômicas completas;
- Diagnóstico, prescrição ou orientação clínica individual;
- Planos anuais, familiares, institucionais ou múltiplas faixas de preço;
- Comunidade, chat entre alunos ou aulas ao vivo;
- Criação integral das malhas anatômicas do zero.

A estrutura de permissões e autoria ficará preparada para o futuro perfil de professor, mas nenhuma interface ou regra comercial desse perfil será implementada no MVP.

## 3. Identidade e experiência visual

### Direção visual

- Estilo clínico premium;
- Azul-marinho profundo como cor principal;
- Verde-esmeralda ou menta como cor de ação, progresso e sucesso;
- Fundos brancos e cinza-claros;
- Tipografia moderna e altamente legível;
- Cards elegantes, sombras discretas e cantos moderados;
- Uso controlado de ilustrações anatômicas e elementos 3D;
- Contraste compatível com WCAG 2.2 AA;
- Interface responsiva e mobile-first.

O design não deverá parecer hospitalar, excessivamente frio, infantil ou semelhante a um cursinho genérico.

### Marca

A assinatura principal combinará:

- Símbolo formado por uma cruz médica construída a partir das páginas de um livro aberto;
- Nome **MEDHELP** em caixa alta;
- Versões horizontal, compacta, monocromática e ícone para favicon/aplicativo;
- Azul-marinho predominante com detalhe verde-esmeralda.

O símbolo deve comunicar medicina e educação sem depender de estetoscópio ou linha de eletrocardiograma genérica.

## 4. Site público e aquisição

### Cabeçalho

- Logo MEDHELP;
- Links para Recursos, Atlas 3D, Disciplinas, Biblioteca, Preço e FAQ;
- Ações Entrar e Começar agora;
- Navegação móvel acessível.

### Hero

**Título:** “Medicina é difícil. Estudar não precisa ser.”

**Subtítulo:** “Resumos, flashcards, biblioteca acadêmica e um Atlas 3D interativo reunidos em uma plataforma criada para acompanhar toda a sua formação médica.”

**Ações:**

- Primária: Começar agora;
- Secundária: Explorar gratuitamente.

Ao lado do texto, haverá uma prévia otimizada do Atlas 3D com animação sutil. O preço “Acesso completo por R$ 30/mês” deverá aparecer na primeira dobra sem ambiguidade.

### Seções da página

1. Principais ferramentas;
2. Demonstração do Atlas 3D;
3. Organização por ciclos e disciplinas;
4. Benefícios para a rotina de estudo;
5. Conteúdos gratuitos disponíveis;
6. Plano único de R$ 30 por mês;
7. Perguntas frequentes;
8. Chamada final para assinatura;
9. Rodapé com contato, termos, privacidade, créditos e licenças.

### Demonstração gratuita

Visitantes poderão consultar amostras de resumos e flashcards, parte da biblioteca e um conjunto limitado de estruturas do Atlas. O MVP não terá período de teste integral. Conteúdos premium exibirão uma prévia e uma chamada para assinatura.

## 5. Organização acadêmica

O catálogo será independente da grade específica de uma faculdade e organizado por:

```text
Ciclo → Disciplina → Módulo → Aula → Recursos relacionados
```

### Ciclos

- Básico;
- Clínico;
- Internato.

### Tipos de conteúdo

- Aulas em vídeo;
- Conteúdo textual com imagens;
- Resumos;
- PDFs e anexos;
- Flashcards;
- Questões e simulados;
- Ebooks gratuitos;
- Materiais complementares;
- Estruturas anatômicas relacionadas.

O catálogo poderá nascer sem matérias publicadas, mas banco de dados, painel administrativo e componentes deverão suportar toda a hierarquia desde o início.

## 6. Autenticação, perfis e acesso

### Perfis iniciais

- **Aluno:** consome conteúdos e gerencia seus próprios dados, progresso e assinatura;
- **Editor interno:** cria e organiza conteúdos, sem acesso a pagamentos ou configurações sensíveis;
- **Administrador:** controla conteúdo, usuários, pagamentos, permissões e configurações.

### Fluxos

- Cadastro com nome, e-mail e senha;
- Confirmação de e-mail;
- Login e logout;
- Recuperação e redefinição de senha;
- Aceite versionado dos termos e da política de privacidade;
- Proteção de rotas conforme papel e situação da assinatura;
- Exportação e solicitação de exclusão dos dados pessoais.

O perfil futuro de professor será representável pelo modelo de permissões, mas não será disponibilizado no lançamento.

## 7. Área do aluno

### Dashboard

- Saudação personalizada;
- Sequência diária de estudos;
- Botão Continuar estudando;
- Progresso por ciclo e disciplina;
- Flashcards pendentes para revisão;
- Conteúdos recentes e favoritos;
- Atalho destacado para o Atlas 3D;
- Situação e vencimento da assinatura.

### Navegação

1. Início;
2. Disciplinas;
3. Resumos;
4. Flashcards;
5. Questões;
6. Biblioteca;
7. Atlas 3D;
8. Meu progresso.

No celular, os destinos principais serão agrupados em barra inferior, mantendo Início, Estudos, Atlas, Revisões e Perfil acessíveis com uma mão.

### Experiência da aula

O aluno poderá:

- Assistir ao vídeo e retomar do último ponto salvo;
- Ler textos e visualizar imagens;
- Abrir anexos autorizados;
- Marcar a aula como concluída;
- Favoritar o conteúdo;
- Acessar resumos, flashcards, questões e estruturas anatômicas associadas.

O progresso será salvo automaticamente e sincronizado entre dispositivos. Perder o acesso premium não apagará histórico, favoritos ou progresso; esses dados voltarão a ser utilizáveis quando a assinatura for regularizada.

## 8. Flashcards, questões e progresso

### Flashcards

Os cartões terão frente, verso, explicação opcional, mídia, disciplina, tags e relacionamentos com aula ou estrutura anatômica.

A revisão espaçada usará quatro respostas:

- Errei;
- Difícil;
- Bom;
- Fácil.

O algoritmo inicial será determinístico, testável e baseado no histórico do aluno. O sistema calculará a próxima revisão, manterá fila diária e impedirá que respostas repetidas gerem registros inconsistentes.

### Questões e simulados

- Questões de múltipla escolha;
- Uma alternativa correta no MVP;
- Explicação da resposta;
- Filtros por ciclo, disciplina, módulo e dificuldade;
- Simulados configurados pelo administrador;
- Resultado com acertos, erros e revisão comentada.

### Progresso

- Conclusão de aulas;
- Desempenho por disciplina;
- Histórico de revisões;
- Acertos em questões;
- Sequência de dias ativos;
- Conteúdos e estruturas favoritas.

## 9. Biblioteca de ebooks

A biblioteca aceitará apenas arquivos:

- Em domínio público;
- Com licença aberta compatível;
- Produzidos pela MEDHELP;
- Ou distribuídos com autorização expressa.

Cada item deverá registrar título, autores, edição, capa, descrição, idioma, disciplina, origem, tipo de licença, URL da licença, arquivo e status de publicação. O sistema não deverá permitir publicação sem informação de direitos preenchida e validada pelo editor.

Os arquivos premium ou restritos serão entregues por URL temporária. O MVP não prometerá impedir capturas de tela ou redistribuição após download; aplicará controles razoáveis sem criar falsa garantia de DRM absoluto.

## 10. Atlas MEDHELP 3D

### Base anatômica

O Atlas usará **BodyParts3D 4.0**, mantido pelo Database Center for Life Science do Japão, sob licença CC BY 4.0. A atribuição, o link da licença e a indicação das modificações serão exibidos em página própria.

A base representa um adulto masculino de referência. Essa limitação deverá ser informada ao usuário. Nomes, agrupamentos, materiais e textos educacionais exigirão curadoria e revisão humana.

Referências oficiais:

- <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html>
- <https://creativecommons.org/licenses/by/4.0/>

### Funcionalidades do visualizador

- Corpo humano completo da base selecionada;
- Rotação, zoom, movimentação e recentralização;
- Seleção direta de estruturas;
- Busca em português, inglês e latim;
- Filtros por sistema, região e camada;
- Ocultar, exibir, isolar e aplicar transparência;
- Painel com nome, descrição, função e relações anatômicas;
- Acesso a resumos, flashcards e questões relacionados;
- Favoritos;
- Demonstração pública limitada.

### Sistemas iniciais

- Esquelético;
- Muscular;
- Nervoso;
- Cardiovascular;
- Respiratório;
- Digestório;
- Urinário;
- Reprodutor;
- Endócrino;
- Linfático;
- Tegumentar.

### Pipeline de ativos

O pipeline executado fora do navegador deverá:

1. Validar a origem e a integridade dos arquivos;
2. Mapear IDs do BodyParts3D para o catálogo MEDHELP;
3. Converter OBJ para GLB/glTF;
4. Normalizar escala, orientação, origem e materiais;
5. Gerar níveis de detalhe quando tecnicamente viável;
6. Comprimir geometrias com Meshopt ou Draco após comparação de desempenho;
7. Separar pacotes por sistema e região;
8. Gerar manifesto versionado com tamanhos, hashes e relacionamentos;
9. Publicar os arquivos otimizados no armazenamento;
10. Produzir relatório de falhas e estruturas não convertidas.

O conjunto original será preservado fora da distribuição pública. O pipeline deverá ser reproduzível e nunca depender de alterações manuais não registradas.

### Desempenho e fallback

- Carregamento inicial leve e progressivo;
- Download sob demanda por sistema ou região;
- Cancelamento de requisições obsoletas;
- Redução automática de qualidade em dispositivos com pouca memória;
- Limite de estruturas simultâneas conforme capacidade detectada;
- Liberação de geometrias e materiais não utilizados;
- Estado de carregamento e recuperação após falha;
- Fallback com imagens e informações anatômicas quando WebGL não estiver disponível.

Uma falha no Atlas não poderá indisponibilizar aulas, pagamentos ou demais áreas da MEDHELP.

### Contrato de integração

O Atlas receberá da plataforma:

- Identidade e papel do usuário;
- Situação de acesso;
- Localização e idioma;
- ID opcional da estrutura que deve ser aberta;
- Links de conteúdos relacionados.

O Atlas devolverá eventos tipados para seleção, isolamento, busca, favoritar, erro e métricas de uso. A plataforma será a fonte oficial de autenticação, assinatura e conteúdo; o Atlas não manterá um sistema paralelo para esses domínios.

## 11. Painel administrativo

### Conteúdo

- CRUD de ciclos, disciplinas, módulos e aulas;
- Conteúdo em vídeo, texto, imagens, PDFs e anexos;
- CRUD de resumos, flashcards, questões e simulados;
- Gestão da biblioteca e das licenças;
- Associação entre conteúdos e estruturas anatômicas;
- Definição de acesso gratuito ou premium;
- Estados rascunho, revisão, publicado e arquivado;
- Programação de publicação;
- Pré-visualização antes de publicar.

### Usuários e assinaturas

- Pesquisa e consulta de alunos;
- Situação da assinatura e histórico de pagamentos;
- Progresso e último acesso;
- Concessão ou suspensão manual com justificativa obrigatória;
- Reenvio de notificações e links de pagamento;
- Exportação em CSV.

### Indicadores

- Assinantes ativos;
- Novas assinaturas e cancelamentos;
- Receita mensal confirmada;
- Conteúdos mais acessados;
- Taxa de conclusão;
- Desempenho agregado em flashcards e questões;
- Uso do Atlas 3D.

Exclusões de conteúdo serão arquivamentos recuperáveis por padrão. Alterações sensíveis gerarão registro de auditoria com autor, data, alvo e resumo da ação.

## 12. Assinatura e pagamentos

### Regras comerciais

- Plano único de R$ 30 por mês;
- Cartão com renovação automática;
- PIX avulso concede 30 dias de acesso após confirmação;
- Sem teste integral gratuito no MVP;
- Cancelamento impede cobranças futuras e mantém o acesso até o final do período pago;
- Falha no cartão inicia tolerância de três dias antes do bloqueio premium;
- Progresso e dados do aluno são preservados após bloqueio.

### Integração

Mercado Pago será o provedor inicial. A MEDHELP não receberá nem armazenará dados brutos de cartão.

O processamento deverá:

- Validar assinatura dos webhooks quando oferecida pelo provedor;
- Registrar o evento bruto e seu identificador;
- Processar eventos de forma idempotente;
- Reconsultar o provedor em estados ambíguos;
- Permitir reprocessamento seguro;
- Manter histórico imutável das transições relevantes;
- Nunca conceder acesso apenas com base no retorno do navegador.

Estados internos mínimos: pendente, ativo, em tolerância, expirado, cancelado e reembolsado.

Lembretes serão enviados antes do vencimento do PIX e durante a recuperação de falha no cartão. E-mails transacionais usarão um provedor dedicado, inicialmente Resend, isolado por adaptador para possível substituição futura.

## 13. Arquitetura técnica

### Abordagem

**Monólito modular moderno em monorepo.** Essa abordagem reduz custo operacional e acelera o lançamento sem misturar responsabilidades.

### Tecnologias

- Next.js App Router e TypeScript;
- React;
- Supabase PostgreSQL, Auth e Row Level Security;
- Mercado Pago;
- Cloudflare R2 para vídeos, PDFs, ebooks e ativos do Atlas;
- Three.js e React Three Fiber no visualizador;
- Vercel para aplicação e APIs;
- Resend para e-mails transacionais;
- Sentry para erros e desempenho da aplicação.

### Organização lógica do monorepo

```text
apps/
  web/                  # site, aluno, administração e APIs
packages/
  ui/                   # design system compartilhado
  domain/               # tipos e regras puras de negócio
  atlas-viewer/         # visualizador 3D reutilizável
  config/               # configuração compartilhada
tools/
  atlas-pipeline/       # ingestão, conversão e validação de malhas
supabase/
  migrations/
  seed/
  tests/
docs/
```

As fronteiras são lógicas; o MVP não introduzirá microserviços. Integrações externas deverão ficar atrás de adaptadores para testes e substituição controlada.

## 14. Modelo de dados conceitual

### Identidade e autorização

- profiles;
- roles;
- user_roles;
- legal_acceptances;
- audit_logs.

### Conteúdo

- cycles;
- disciplines;
- modules;
- lessons;
- lesson_blocks;
- attachments;
- summaries;
- content_relations;
- tags;
- content_tags.

### Aprendizagem

- lesson_progress;
- favorites;
- flashcard_decks;
- flashcards;
- flashcard_reviews;
- questions;
- question_options;
- quiz_attempts;
- quiz_answers;
- study_streaks.

### Biblioteca

- ebooks;
- ebook_licenses;
- ebook_disciplines.

### Atlas

- anatomy_structures;
- anatomy_names;
- anatomy_relations;
- anatomy_asset_versions;
- anatomy_content_links;
- anatomy_favorites.

### Cobrança

- plans;
- subscriptions;
- payments;
- payment_events;
- access_grants.

Tabelas de domínio usarão identificadores estáveis, timestamps, integridade referencial e exclusão lógica quando aplicável. Políticas RLS deverão negar acesso por padrão e liberar apenas operações explicitamente autorizadas.

## 15. Segurança, privacidade e conformidade

- RLS em todas as tabelas com dados privados;
- Verificação de papel no servidor para operações administrativas;
- Segredos somente em variáveis protegidas;
- URLs temporárias para arquivos restritos;
- Rate limiting em autenticação, busca, formulários e endpoints sensíveis;
- Proteção contra CSRF onde aplicável, XSS, injeção e upload inseguro;
- Validação de tipo, tamanho e conteúdo de arquivos;
- Logs sem senhas, tokens, dados de cartão ou conteúdo pessoal desnecessário;
- Auditoria administrativa;
- Backups e procedimento documentado de restauração;
- Política de privacidade, termos de uso, créditos e licenças;
- Fluxos de acesso, exportação, correção e exclusão conforme LGPD;
- Aviso de finalidade educacional e limites do conteúdo médico.

## 16. Tratamento de erros e resiliência

- Mensagens claras para o usuário, sem exposição de stack trace;
- Identificador de correlação para suporte;
- Nova tentativa apenas em operações seguras;
- Estados vazios e degradados para indisponibilidade parcial;
- Filas ou reprocessamento para webhooks e e-mails;
- Páginas de erro por módulo;
- O Atlas será carregado no cliente e isolado por error boundary;
- Conteúdo textual continuará utilizável quando mídia ou 3D falhar;
- Falha de analytics nunca bloqueará fluxos do produto.

## 17. Acessibilidade, responsividade e SEO

- Navegação completa por teclado fora das limitações inerentes ao canvas 3D;
- Alternativas textuais para controles e conteúdo visual;
- Foco visível e ordem lógica;
- Contraste WCAG 2.2 AA;
- Legendas e transcrições para vídeos quando publicados;
- Respeito à preferência de redução de movimento;
- Layouts validados em celulares, tablets e desktops;
- Metadados, sitemap, robots.txt e dados estruturados na área pública;
- Área autenticada fora da indexação pública;
- URLs públicas estáveis e semanticamente claras.

## 18. Estratégia de testes

### Unitários

- Regras de acesso;
- Estados de assinatura;
- Revisão espaçada;
- Cálculo de progresso;
- Permissões;
- Normalização do manifesto anatômico.

### Integração

- Banco e RLS;
- Autenticação;
- Mercado Pago e idempotência de webhooks;
- Armazenamento e URLs temporárias;
- Publicação de conteúdo;
- Pipeline e manifesto do Atlas.

### Ponta a ponta

- Cadastro, confirmação, login e recuperação;
- Compra por cartão;
- Compra e renovação por PIX;
- Bloqueio e recuperação de acesso;
- Jornada de estudo completa;
- Flashcards e questões;
- Publicação administrativa;
- Demonstração e experiência premium do Atlas.

### Qualidade transversal

- Responsividade;
- Acessibilidade automatizada e manual;
- Navegadores suportados;
- SEO público;
- Carga e segurança;
- Orçamentos de desempenho para aplicação e Atlas;
- Testes em dispositivos móveis reais antes do lançamento.

## 19. Critérios de aceite do MVP

O MVP estará pronto para lançamento quando:

1. O visitante compreender proposta, recursos e preço sem cadastro;
2. Cadastro, confirmação, login e recuperação funcionarem de ponta a ponta;
3. Cartão e PIX alterarem o acesso somente após confirmação confiável;
4. Alunos conseguirem navegar por ciclos, disciplinas, módulos e aulas;
5. Progresso, favoritos, flashcards e questões persistirem corretamente;
6. A biblioteca impedir publicação sem metadados de direitos;
7. O painel permitir operação diária sem alteração de código;
8. O Atlas oferecer busca, seleção, filtros, isolamento e relações educacionais;
9. O Atlas carregar progressivamente e oferecer fallback quando necessário;
10. Dados privados estiverem protegidos por RLS e testes de autorização;
11. Fluxos críticos tiverem testes automatizados e monitoramento;
12. Interface estiver responsiva, acessível e estável nos navegadores suportados;
13. Termos, privacidade, créditos e atribuição do BodyParts3D estiverem publicados;
14. Não existirem erros críticos conhecidos nos fluxos de aquisição, estudo, cobrança ou administração.

## 20. Divisão de execução

### Plataforma MEDHELP

Pode ser implementada em blocos completos pelo executor GPT-5.6, seguindo prompts autocontidos com objetivo, contexto, escopo, restrições, critérios de aceite, testes e saída esperada.

### Atlas MEDHELP 3D

Deverá ser desenvolvido no Codex como subprojeto especializado, começando por uma prova técnica controlada do pipeline antes da integração completa. O contrato definido nesta especificação deverá ser preservado.

### Regra de coordenação

Nenhum executor deverá alterar unilateralmente decisões de produto, preço, licença, arquitetura ou contrato entre módulos. Descobertas que exijam mudança relevante voltarão ao orquestrador para decisão antes da implementação.

## 21. Riscos e respostas

| Risco | Resposta planejada |
|---|---|
| Malhas pesadas em celulares | Pacotes progressivos, compressão, qualidade adaptativa e fallback |
| Nomenclatura anatômica inconsistente | IDs estáveis, curadoria multilíngue e revisão humana |
| Conteúdo médico incorreto | Fluxo de revisão antes da publicação e rastreio de autoria |
| Ebooks sem permissão | Metadados de licença obrigatórios e bloqueio de publicação |
| Webhook duplicado ou fora de ordem | Idempotência, histórico de eventos e reconciliação com o provedor |
| Vazamento de conteúdo premium | RLS, URLs temporárias e controles razoáveis sem promessa de DRM absoluto |
| Escopo excessivo no lançamento | Exclusões explícitas e dois subprojetos com fronteiras definidas |
| Dependência de fornecedor | Adaptadores para pagamentos e e-mail; ativos próprios no armazenamento |

## 22. Decisões aprovadas

- Abordagem A: monólito modular;
- Next.js, Supabase, Mercado Pago, Cloudflare R2, Vercel e Three.js/React Three Fiber;
- Assinatura de R$ 30 por mês;
- Cartão recorrente e PIX por 30 dias;
- Organização por disciplinas e ciclos;
- Conteúdo publicado somente pela equipe interna no MVP;
- Área pública de demonstração;
- Aulas com vídeo, texto, imagens, anexos, flashcards, questões e progresso;
- Identidade clínico premium;
- Símbolo de marca acompanhado do nome MEDHELP;
- Chamada “Medicina é difícil. Estudar não precisa ser.”;
- BodyParts3D 4.0 como base licenciada do Atlas;
- Corpo humano completo da base no escopo inicial;
- Plataforma principal executada em blocos pelo GPT-5.6;
- Pipeline e visualizador do Atlas desenvolvidos como subprojeto no Codex.

