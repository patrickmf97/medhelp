# MEDHELP — banco de questões autorais e piloto Enamed

Data: 03/10/2026, America/Sao_Paulo.
Estado: desenho em conversa aprovado; esta especificação aguarda revisão de Patrick. Não representa questões produzidas, revisão médica concluída ou funcionalidade publicada.

## 1. Objetivo e escopo

Oferecer prática de raciocínio clínico para estudantes de medicina, com questões originais comentadas inspiradas no formato do Enamed. Meta editorial: 5.000 questões distintas aprovadas, não 5.000 variações superficiais nem rascunhos contados como publicados.

Primeira entrega: lote representativo de 100 questões em rascunho, instrumento de revisão e experiência de resolução testada com itens fictícios. A expansão editorial ocorre somente depois da avaliação do piloto. A publicação depende de revisão clínica qualificada e aprovação editorial registrada.

Há duas frentes relacionadas, com entregas verificáveis separadas:

1. Acervo: matriz, referências, autoria, checagem, revisão e exportação do piloto.
2. Aplicativo: importação segura, revisão administrativa, resolução, comentários, histórico, favoritos, caderno de erros e simulados.

Não implementar as duas frentes em uma alteração indivisível. O plano posterior deve separar contratos, produção editorial e aplicativo em etapas testáveis. Não modificar pagamentos, preço, e-mails, Atlas ou as 83 aulas existentes nesta tarefa.

## 2. Contexto existente

Repositório: patrickmf97/medhelp; aplicação Next.js em apps/web; componentes de domínio em packages/domain; autenticação, autorização e persistência existentes no Supabase. Questões e simulados constam do desenho original em docs/superpowers/specs/2026-09-22-medhelp-design.md, seção 8, e da tarefa 9 do plano original.

A inspeção local encontrou flashcards implementados e referências ao futuro banco de questões, mas não encontrou rotas dedicadas de questões nem migração própria de quizzes. Antes de implementar, confirmar o estado atualizado de main e das tabelas: referências de planejamento não comprovam funcionalidade entregue.

Reutilizar os padrões existentes de sessão, autorização administrativa e acesso Premium. Não conceder assinatura automaticamente a administradores. Não incluir novos provedores pagos nem usar APIs de geração que possam gerar cobrança sem autorização.

## 3. Referência editorial e distribuição

Usar como orientação o manual, a matriz e os cadernos oficiais disponíveis no portal do Inep. Questões do MEDHELP são autorais, não oficiais e não endossadas pelo Inep. Não copiar enunciados, comentários ou alternativas de bancos comerciais, livros ou provas para formar o acervo autoral.

Fontes iniciais de orientação, verificadas em 03/10/2026:

- https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enamed/inep-lanca-manual-explicativo-sobre-o-enamed
- https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enamed/provas-e-gabaritos/2026

Antes de redigir o piloto, ler a matriz/manual completos e registrar os identificadores exatos de competências adotados. Não inventar códigos oficiais nem confundir alinhamento editorial com calibração estatística do exame.

Distribuição inicial do MEDHELP, sujeita aos achados do piloto; não é uma cota oficial do Enamed:

| Área primária | Piloto | Meta total |
| --- | ---: | ---: |
| Clínica médica | 20 | 1.000 |
| Cirurgia | 20 | 1.000 |
| Pediatria | 20 | 1.000 |
| Ginecologia e obstetrícia | 20 | 1.000 |
| Medicina de família e comunidade / saúde coletiva | 20 | 1.000 |
| Total de itens únicos | 100 | 5.000 |

Saúde mental é marcador transversal, sem dupla contagem: no mínimo 10 itens do piloto e 500 da meta total, inseridos nas áreas primárias. Urgências, prevenção, ética, segurança do paciente e cenários do SUS também recebem marcadores transversais. Não forçar vínculos às aulas introdutórias quando o tema não está coberto por elas.

Cada conjunto de 20 itens do piloto terá 5 itens de dificuldade estimada fácil, 10 média e 5 difícil. Essas classificações são editoriais, não calibradas. Priorizar decisões contextualizadas, diagnóstico, interpretação e conduta; nenhum lote poderá ser composto apenas de recordação factual. Casos inteiramente fictícios, sem dados identificáveis de pacientes.

## 4. Contrato de cada questão

Formato de intercâmbio: JSON UTF-8 versionado, validado antes de importação; exportação Markdown para revisão humana. Campos obrigatórios:

- ID editorial estável, versão inteira positiva e ID do lote.
- Área primária, tema, competência oficial identificada na matriz, contexto assistencial e marcadores transversais.
- Enunciado e comando específico, suficientes para decidir sem informações omitidas.
- Exatamente quatro alternativas com IDs estáveis A–D, todas não vazias e distintas.
- Exatamente uma melhor resposta; justificativa dessa resposta e explicação individual das outras três alternativas.
- Dificuldade estimada e objetivo de aprendizagem.
- Referências: título, órgão/autores, edição/data, URL verificável, localização da evidência e data de consulta. Referência deve sustentar a resposta e os comentários, não apenas mencionar o tema.
- Estado editorial e trilha de autoria/revisão: quem realizou cada etapa, data, decisão, versão revisada e observações.

URLs inacessíveis, fontes contraditórias ou recomendações sem sustentação bloqueiam aprovação. Preferir documentos oficiais brasileiros e diretrizes de sociedades/organismos competentes; registrar a versão adotada e o contexto em que a recomendação se aplica. Referências não devem ser inventadas por modelos.

IDs de opção permanecem estáveis mesmo se a ordem de exibição variar. Comentários referem-se ao conteúdo das opções, não a uma posição visual que pode mudar.

## 5. Autoria, controle de qualidade e publicação

Fluxo: rascunho → checada → aprovada → publicada; retirada é possível a partir de publicada. Checada significa validação estrutural e editorial assistida, não revisão por médico. Aprovada exige revisão clínica qualificada de cada item e aprovação editorial. Registrar a identidade e a qualificação do revisor real; não fabricar credenciais nem interpretar a aprovação genérica de Patrick como revisão médica dos itens.

Condição atual: não há neste trabalho um revisor clínico designado. Isso não impede rascunhos ou desenvolvimento, mas impede publicar conteúdo como clinicamente revisado. Disponibilidade do revisor é dependência de publicação, não de produção do piloto.

Checagem automática: estrutura, IDs únicos, completude, uma resposta correta, alternativas distintas, links e hashes. Checagem editorial: coerência entre caso, resposta e comentários; plausibilidade dos distratores; ausência de pistas; medidas/unidades; ausência de dupla resposta defensável.

Duplicatas exatas são rejeitadas por normalização e hash. Similaridade de texto e coincidência de objetivo/caso sinalizam possíveis duplicatas para revisão; o detector não garante originalidade sozinho. Mudanças só de nome, idade ou números não contam como novos itens. Questões relacionadas podem coexistir apenas quando a decisão avaliada e as informações relevantes forem substantivamente diferentes.

Alterações de conteúdo após aprovação criam nova versão em rascunho. Aprovação anterior não passa para a nova versão. Suspender imediatamente itens com possível erro clínico até revisão. Histórico anterior mantém a versão respondida, sem ser reescrito silenciosamente. Se uma questão for anulada, sinalizar e excluir dos cálculos agregados válidos, preservando a tentativa como registro.

Importação em lotes de 100, com prévia de criar/sem alteração/conflito. Mesmo ID e versão com conteúdo diferente é conflito; mesmo pacote reaplicado não cria duplicatas. Aplicação de lote é transacional. Importar não publica: publicação é ação administrativa separada, restrita aos itens aprovados daquela versão.

Não armazenar rascunhos ou gabaritos em arquivos públicos da aplicação. Se o repositório for público, entregar lotes por arquivo privado e importar pelo caminho administrativo autenticado; especificações sem questões podem ficar no repositório.

## 6. Experiência do aluno

Banco restrito ao acesso Premium vigente, com filtros por área, tema e dificuldade; relações opcionais com ciclo/disciplina/aula quando corretas. Mostrar quantidade publicada real, nunca meta de 5.000 como acervo disponível.

Modo estudo: aluno abre questão sem gabarito, escolhe uma alternativa e confirma. Servidor valida sessão, direito de acesso, questão/versionamento e alternativa. Somente após submissão aceita, devolve resultado e comentários daquela questão. Mostrar referências e permitir reportar erro. Possível repetir para estudar; cada nova resposta é uma nova tentativa, nunca alteração do resultado anterior.

Simulados: configurações administrativas com 20, 50 ou 100 itens publicados e sem duplicação dentro da sessão; se não houver itens elegíveis suficientes, informar e não completar com itens repetidos. Emulado, não prova oficial. Em modo simulado, comentários e acertos são liberados somente após finalizar. Ordem e versões ficam congeladas ao iniciar. Antes da finalização, respostas podem ser alteradas; depois, resultado imutável. Itens não respondidos aparecem separados e não são contados como acertos. Nota exibida é percentual de acertos válidos, não TRI nem previsão de nota oficial.

Histórico individual, favoritos e caderno de erros privado. O caderno considera a tentativa finalizada mais recente por questão: erro inclui o item; acerto posterior o remove da fila atual sem apagar o histórico. Página de resultado distingue acertos, erros, não respondidos e anulados.

Filtros sem resultados mostram estado vazio. Falhas de rede não devem exibir sucesso sem persistência; submissões repetidas usam chave de idempotência para não duplicar tentativa. Interface móvel acessível, teclado funcional, foco perceptível e estados de carregamento/erro claros.

## 7. Persistência e limites de segurança

Separar conteúdo visível antes da resposta de gabaritos e explicações restritos. Entidades lógicas: questões/versionamento, alternativas, gabaritos/comentários privados, referências, lotes/revisões, sessões de simulado, itens da sessão, respostas/tentativas, favoritos e relatos de erro.

Gabaritos e comentários não ficam em colunas acessíveis por SELECT público, payload de renderização, HTML, JavaScript estático ou consulta REST direta do aluno antes da resposta. Não confiar em ocultação de interface. Correção ocorre em serviço estritamente server-only com identidade verificada e acesso às entidades privadas; mecanismo SQL/API final deve ser definido no plano após consulta à documentação atual, com testes de autorização. Não tornar funções privilegiadas públicas para resolver permissões.

RLS e concessões mínimas para dados expostos. Alunos só acessam suas próprias tentativas, sessões, favoritos e relatos; apenas administradores autorizados importam, revisam e publicam. Papel administrativo não deriva de metadados editáveis pelo usuário. Nenhuma chave secreta enviada ao cliente. A aprovação editorial não concede acesso Premium.

Após submissão em estudo, mostrar apenas o gabarito daquele item e daquela tentativa. Em simulado aberto, bloquear a obtenção de comentários pela rota de resultado. Tentativa deve referenciar versão publicada válida e registrar resultado calculado pelo servidor, sem aceitar nota enviada pelo cliente. Preservar as tabelas e registros de aulas, progresso e favoritos já existentes.

## 8. Critérios de aceite

### Piloto editorial

- 100 itens únicos completos, 20 por área primária, distribuição de dificuldade e marcadores conforme seção 3.
- Cada gabarito e comentário sustentado por referência consultada, sem placeholders ou URLs fabricadas.
- Relatório por estado editorial, quantidade por tema, alertas de similaridade e pendências de revisão.
- Nenhum item anunciado como revisado por médico sem revisão real registrada; itens pendentes permanecem rascunhos/checados e privados.

### Aplicativo

- Testes automatizados de pontuação, validação de opções, idempotência, versionamento, importação repetida, conflito e rollback do lote.
- Testes de isolamento entre dois alunos, acesso sem Premium, aluno versus administrador, REST direto e ausência de gabarito antes de responder/finalizar.
- Testes de estudo, simulado parcial, simulado finalizado, caderno de erros, favoritos, reporte, item retirado/anulado e revisão administrativa.
- Jornada móvel verificada; atualização de página não perde respostas persistidas; resultado não pode ser adulterado após finalização.
- Banco de dados existente preservado; ambiente de teste não cobra pagamentos nem concede direitos reais.
- Publicação de produção separada da implementação, com cópia de segurança proporcional às alterações, migração revisada e verificação posterior.

### Expansão para 5.000

- Piloto avaliado antes da expansão; corrigir padrão editorial e contrato antes de replicar.
- 50 lotes identificáveis de 100; primeiro lote incluso, não somado à meta.
- Contagem de itens únicos por estado; auditoria de duplicatas entre lotes, não apenas dentro do lote.
- Cada publicação exige o mesmo aceite clínico/editorial; não reduzir revisão para atingir a quantidade.
- Não prometer produção em segundo plano ou prazo sem execução mensurável. Informar quantidades efetivamente produzidas, aprovadas e publicadas a cada entrega.

## 9. Próxima etapa

Patrick revisa esta especificação. Após aprovação, elaborar plano técnico e editorial com arquivos, testes, etapas e dependências. Em consonância com o fluxo do projeto, esse plano pode ser transformado em instrução autocontida para Claude Code ou executado aqui mediante a escolha do usuário. Não executar implementação nem apresentar 100 questões como prontas nesta etapa documental.
