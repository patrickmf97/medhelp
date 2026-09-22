# MEDHELP

Plataforma de apoio para estudantes de medicina com resumos, aulas, flashcards, questões, biblioteca acadêmica e Atlas 3D interativo.

> Medicina é difícil. Estudar não precisa ser.

## Estado do projeto

Projeto em planejamento aprovado e início de implementação.

- Arquitetura: monólito modular em monorepo
- Aplicação: Next.js + TypeScript
- Dados e autenticação: Supabase
- Pagamentos: Mercado Pago
- Arquivos: Cloudflare R2
- Atlas: Three.js + React Three Fiber
- Plano inicial: R$ 30/mês

## Documentação

- [Especificação funcional e técnica](docs/superpowers/specs/2026-09-22-medhelp-design.md)
- [Plano de implementação da plataforma](docs/superpowers/plans/2026-09-22-medhelp-platform.md)
- [Plano de implementação do Atlas 3D](docs/superpowers/plans/2026-09-22-medhelp-atlas.md)
- [Prompt 01 — Fundação, site público e autenticação](prompts/medhelp/01-plataforma-fundacao-home-autenticacao.md)

## Organização da execução

A plataforma principal será implementada em blocos completos pelo GPT-5.6. O pipeline de ativos e o visualizador do Atlas 3D serão desenvolvidos como subprojeto especializado no Codex. As decisões de produto e os contratos entre módulos permanecem centralizados na especificação.
