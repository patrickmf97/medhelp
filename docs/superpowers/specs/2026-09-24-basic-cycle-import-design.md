# MEDHELP — Integração do ciclo básico v0.3

Data: 24/09/2026
Estado: especificação para revisão do usuário; implementação não iniciada.
Base examinada: c66940964096dafec59a4ddf16e55de7d73fd69d.
Objetivo aprovado: levar as aulas revisadas à experiência existente de estudo, preservando acesso, favoritos e progresso.

## Evidências do código atual

- Existe catálogo em apps/web/app/aluno/disciplinas/page.tsx.
- Existe leitor em apps/web/app/aluno/disciplinas/[id]/page.tsx.
- O leitor já utiliza getStudentLesson, LessonControls, progresso e favoritos.
- Os contratos existentes representam ciclo, disciplina, módulo e aula.
- O repositório editorial usa draft, review, published e archived, com autorização de editor/admin.
- Os textos estão em content/ciclo-basico, com catálogo de 83 aulas e o arquivo anterior EG-01 em content/drafts.
- Não foi conferido o estado do banco remoto. Presença de código não comprova funcionamento em produção.

## Abordagem

Reutilizar o catálogo, leitor e persistência existentes. Introduzir uma importação administrativa repetível, com simulação anterior a qualquer alteração. Não embutir todo o conteúdo premium em arquivos públicos ou no JavaScript entregue ao navegador.

Alternativas consideradas: cadastrar 83 aulas manualmente é mais lento e sujeito a omissões; servir Markdown diretamente exigiria outra política de acesso e duplicaria o fluxo editorial. A importação preserva o modelo já existente.

## Contrato da importação

1. Ler catalogo.json e seus arquivos de origem. Recusar caminhos externos ao acervo autorizado.
2. Extrair as seções de aula por identificador; tratar explicitamente as duas seções antigas de EG-01.
3. Validar exatamente 12 disciplinas, 72 módulos e 83 aulas; recusar IDs duplicados, conteúdo vazio e fontes ausentes.
4. Converter explicações, objetivos, exercícios, comentários, sínteses e referências em blocos compatíveis com o leitor. Tabelas não podem perder associação entre linhas e colunas. Não renderizar HTML arbitrário.
5. Identificar cada aula pelo ID editorial estável. Preservar o ID persistido em reimportações, evitando perda de progresso e favoritos.
6. Simulação deve listar inclusões, alterações e conflitos. Nenhuma exclusão automática. Em divergência com edição administrativa posterior, interromper o item e informar o conflito.
7. Reexecutar o mesmo lote não deve duplicar aulas nem alterar progresso.
8. Importar inicialmente no estado review, sem publicar parcialmente. Após conferência, usar as transições editoriais autorizadas para publicação.
9. Manter as aulas existentes gratuitas como estão. Novas aulas serão premium por padrão nesta proposta; não converter material gratuito em pago.
10. Registrar origem, versão do acervo, ator e resumo da operação, sem credenciais ou dados desnecessários.

## Experiência do aluno

Preservar o visual clínico premium. Organizar a lista por disciplina e módulo, com links para o leitor existente. Exibir condição de acesso, conclusão e continuidade com dados reais. Conteúdo bloqueado não deve ser incluído na resposta ao cliente. Progresso deve permanecer após expiração de acesso.

Manter a apresentação como trilha introdutória: os 72 módulos têm pontos de entrada, não cobertura exaustiva da graduação. A validação comunicada pelo usuário consta no registro editorial; não criar selo de revisão médica especializada.

## Arquivos previstos

- scripts/content/: conversor, validação e simulação com testes.
- apps/web/lib/content/: integração administrativa com o fluxo existente.
- apps/web/app/aluno/disciplinas/page.tsx: agrupamento de disciplinas e módulos.
- Leitor existente: apenas adaptações necessárias para blocos e referências.
- Testes de conteúdo, autorização e jornada do aluno.
- Documentação operacional de importação e conferência.

Os nomes finais dos novos arquivos serão definidos no plano de implementação após leitura completa dos contratos de blocos e políticas existentes.

## Critérios de aceite

- Contagens e referências da origem preservadas.
- Simulação sem escrita; repetição sem duplicação; conflito sem sobrescrita silenciosa.
- Aulas premium não acessíveis sem autorização, inclusive em requisição direta.
- Nenhum progresso/favorito removido.
- Objetivos, exercícios, comentários, tabelas e referências legíveis em mobile e teclado.
- Testes de parser, autorização, idempotência e navegação executados.
- Conferência no ambiente de teste antes de publicar em produção.

## Pagamentos: regra preservada, integração separada

Um mês não permite parcelamento. Mais de um mês comprado de uma vez pode permitir, sem inventar descontos ou máximo de parcelas. A referência de preço permanece R$ 30/mês.

A InfinitePay não será ativada por esta importação. Em trabalho separado, verificar conta/InfiniteTag, capacidade real de limitar parcelas por pedido, confirmação de pagamento no servidor e tratamento de estornos. Não confundir compra avulsa de vários meses com renovação automática. Caso o provedor não permita impor a regra, não lançar o checkout em desacordo.

## Fora deste bloco

Troca de gateway em produção, cobrança real, novos preços, assinatura automática, migração de assinantes, atlas 3D, mídia de terceiros, novas aulas e alegações de certificação.
