# Specs

Toda mudança de código começa por uma spec. O Claude Code (ou quem for implementar) lê **só** a spec e os arquivos que ela lista.

## Como pedir ao Claude Code

```
Leia CLAUDE.md e specs/SPEC-0NN-*.md. Implemente a spec. Crie os cenários em backend/features/
e os passos em backend/tests/. Rode `uv run pytest` até ficar verde. Não toque em arquivos fora da lista.
```

## Modelo

```markdown
# SPEC-NNN · título no imperativo

Responsável: … · Revisor: … · Gantt: … · Camada DDD: …

## Contexto
2 a 4 frases: para que serve, em termos simples.

## Arquivos
- CRIAR / ALTERAR `caminho` (e nada além disso)

## Requisitos
R1, R2…, cada um verificável (assinatura, valores, mensagens de erro).

## Constantes
Nome, valor e origem (ou "a validar").

## Cenários (BDD)
Funcionalidade: …
  Cenário: …
    Dado …
    Quando …
    Então …

## Fora do escopo
O que NÃO fazer.
```

## Índice

| Spec | Título | Situação |
|---|---|---|
| [001](SPEC-001-agente-e-regras.md) | Agente de manejo e regras de validação | feita |
| [002](SPEC-002-coleiras-e-ocupacao.md) | Coleiras simuladas e ocupação estimada | feita |
| [003](SPEC-003-planejado-x-realizado.md) | Planejado × realizado e plano externo do SeuGado | feita |
| [004](SPEC-004-api-rest.md) | API REST | feita |
| [005](SPEC-005-gemini.md) | Gemini real escrevendo a explicação | a fazer |
| [006](SPEC-006-clima-open-meteo.md) | Clima real (Open-Meteo) | a fazer |
| [007](SPEC-007-ndvi-sentinel.md) | NDVI real (Sentinel-2) | a fazer · opcional |
| [008](SPEC-008-persistencia-postgres.md) | Persistência PostgreSQL | feita |
| [009](SPEC-009-autenticacao.md) | Autenticação | feita |
| [010](SPEC-010-front-na-api.md) | Front ligado à API | feita |
| [011](SPEC-011-telas-coleiras-verificacao.md) | Telas de coleiras e planejado × realizado | a fazer |
| [012](SPEC-012-seugado-modo-api.md) | Integração SeuGado em modo `api` | a fazer (Kauê) |
| [013](SPEC-013-deploy-vercel.md) | Deploy na Vercel + Supabase | código pronto; falta publicar |
| [014](SPEC-014-documentacao-sdd.md) | Documentação SDD e apresentação | em andamento |
| [015](SPEC-015-identidade-visual.md) | Identidade visual própria | feita |
