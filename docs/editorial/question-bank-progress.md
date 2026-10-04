# Banco de questões — estado verificável

Primeiro lote: 100 rascunhos privados produzidos e salvos, 20 por área e 11 itens transversais de saúde mental; quatro alternativas e explicações individuais. Zero itens clinicamente aprovados ou publicados. Dificuldade e distratores requerem revisão; não há revisor qualificado designado. Meta de 5.000 ainda não atingida.

Implementados no código: contrato estrito de lote, hash/relatório/heurística de duplicatas, domínio de pontuação, tipos públicos, tabelas com gabaritos privados, correção autenticada/idempotente, RLS de tentativas e serviço paginado de leitura. Imutabilidade abrange conteúdo, alternativas e chaves após primeira publicação.

Verificados: 19 testes de scripts, 27 do domínio e 75 da aplicação; typecheck web; build web; lint dos arquivos novos; testes de roles/RLS em PostgreSQL WASM isolado; advisors via socket sem erros e sem avisos das tabelas novas. Os avisos de performance são de tabelas anteriores. Nada foi aplicado a produção.

Limite de integração: PostgREST conecta e consulta a instância PGlite, mas o adaptador experimental interrompe a conexão em erros de permissão, produzindo HTTP503/PGRST001. O teste exige403 e falha; isso não é prova de autorização REST. Não relaxar essa expectativa. Executar scripts/questions/test-rest.mjs em ambiente compatível antes de liberar. Não usar a limitação para esconder erro do aplicativo. PostgreSQL nativo local foi impedido por restrições de troca de UID/grupos do ambiente.

Tarefa2 do plano técnico permanece em andamento. Importação/revisão administrativas, interface de aluno, favoritos/caderno de erros, simulados e validação final das jornadas (tarefas3–7) ainda não implementados. Não anunciar banco disponível ou plano completo. Ordenação atual do serviço por UUID é estável, mas deve ser alinhada ao ID editorial definido no plano junto à verificação REST.

Para retomar: docs/superpowers/plans/2026-10-03-enamed-question-bank.md. Scripts de teste locais exigem módulos PGlite/socket e binário PostgREST fornecidos por caminhos explícitos de ambiente; nunca usam credenciais remotas. Fixtures são neutras e descartadas. Conteúdo médico real continua fora do repositório público.
