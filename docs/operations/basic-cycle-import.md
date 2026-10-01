# Integração do ciclo básico — estado e retomada

## Estado verificado em 01/10/2026

Entrega parcial na branch `codex/basic-cycle-import`, base `87d7e00`.

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

## Bloqueio e próximo passo

`pnpm exec supabase status` (CLI 2.117.0) falhou porque Docker e Podman não estão disponíveis. Não há PostgreSQL local configurado para os testes. Não substituir os testes por um reset remoto.

Retomar a Task 2 de `docs/superpowers/plans/2026-09-24-basic-cycle-import.md` em ambiente descartável com Supabase local. A Task 1 e a Task 3 estão implementadas; não refazê-las. Antes de implementar SQL, conferir documentação/changelog e políticas existentes.

Ainda não existem as RPCs administrativas nem a CLI de importação previstas no plano. Implementar e testar autorização, idempotência, concorrência, colisões e preservação de progresso/favoritos antes de qualquer aplicação. Em seguida executar Task 4: jornada autenticada desktop/mobile, RLS direto, expiração e publicação atômica.

## Condições para produção (não executadas)

1. Suíte de banco e jornada completas em ambiente descartável.
2. Backup verificado do banco correto e sessão administrativa autorizada por meio configurado; não usar credenciais privilegiadas para contornar permissões.
3. Simulação com relatório de inclusões, alterações, conflitos e fingerprint esperado.
4. Aplicação transacional para `review`, preservando IDs, aulas gratuitas e dados de aprendizagem.
5. Conferência de contagens, amostras, referências e acesso; publicação separada e atômica do lote.
6. Repetição da simulação sem novas inclusões. Em falha, não excluir aulas ou progresso; retirada posterior exige arquivamento editorial autorizado.

Pagamentos permanecem fora desta entrega: um mês sem parcelamento; compra de vários meses poderá permitir parcelas em integração posterior.
