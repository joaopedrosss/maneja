# Maneja · instruções para o Claude Code

Leia este arquivo inteiro antes de qualquer tarefa. Ele vale para todos da equipe.

## O que é o Maneja

Painel web de monitoramento do manejo rotacionado de gado. Para cada piquete, o sistema sabe:
- o NDVI (vigor do pasto, por satélite);
- o rebanho cadastrado (bois, vacas e bezerros);
- onde os animais estão de fato, pelas coleiras GPS (simuladas no MVP).

Um agente recomenda as movimentações. **Regras determinísticas decidem e o Gemini só escreve a explicação.** O sistema compara o que foi planejado com o que as coleiras mostram.

É projeto da disciplina de Gerência de Projetos (Equipe Delta). Documentos de referência:

| Documento | Conteúdo |
|---|---|
| `docs/00-visao-e-escopo.md` | O que está e o que não está no escopo |
| `docs/01-decisoes.md` | Decisões já tomadas. Não reabra sem registrar uma nova |
| `docs/02-integracao-seugado.md` | Contrato com o SeuGado |
| `docs/03-plano-ab2.md` | Plano da semana, marcos e Trello |
| `docs/uml/` | Os diagramas UML em texto (Mermaid) |
| `specs/` | Uma spec por fatia de trabalho, com cenários BDD |

## Regra de independência (inviolável)

O Maneja e o SeuGado são sistemas independentes. O Maneja **nunca** pode precisar do SeuGado para subir, rodar testes ou fazer a demonstração. Toda integração passa por `backend/maneja/adaptadores/seugado.py`, e o modo padrão é `desligado`. Não copie código do SeuGado: motor de otimização, SAFER, Telegram, módulo e praça ficam lá.

## Como trabalhamos (SDD + BDD)

1. Toda tarefa começa por uma spec em `specs/SPEC-NNN-*.md`. Sem spec, não há código.
2. A spec traz cenários BDD (Dado / Quando / Então). Eles viram arquivos `.feature` em `backend/features/` e testes com `pytest-bdd`.
3. Implemente só o que a spec pede. O que estiver em "Fora do escopo" não se faz, nem "de leve".
4. Pronto = todos os cenários passando, `uv run pytest` verde, PR revisado por outra pessoa e o cartão do Trello movido.
5. Se a spec estiver ambígua ou errada, pare e pergunte. Não invente regra de negócio nem número.

## Estrutura

```
src/                 front-end (Vite + React + TypeScript), já alinhado ao planejamento
backend/
  maneja/
    dominio.py       tipos do domínio (iguais a src/lib/tipos.ts)
    regras.py        validação determinística de movimentação
    agente.py        AgenteDeManejo: decide (regras) e explica (LLM)
    monitoramento.py NDVI e ocupação estimada pelas coleiras
    verificacao.py   planejado × realizado
    adaptadores/     tudo que fala com fora: satélite, clima, LLM, coleiras, SeuGado
    repositorio.py   armazenamento em memória
    repositorio_pg.py PostgreSQL (com DATABASE_URL; SPEC-008)
    api.py           FastAPI
  features/          cenários BDD (.feature)
  tests/             testes (pytest + pytest-bdd)
```

## Comandos

```bash
cd backend && uv sync                                      # instala dependências
cd backend && uv run pytest                                # todos os testes
cd backend && uv run uvicorn maneja.api:app --reload       # API em http://localhost:8000
npm run dev                                                # front em http://localhost:5173
```

## Convenções

- Código, nomes e mensagens em **português**, sem acento em identificadores.
- Os nomes do domínio seguem `src/lib/tipos.ts`. O JSON da API usa os mesmos nomes de campo (snake_case), para o front trocar o mock pela API sem adaptação.
- Todo número de regra (limites de NDVI, UA por categoria, chuva forte) é constante nomeada em `regras.py` ou `agente.py`, com comentário dizendo de onde veio ou "a validar".
- Serviço externo sempre atrás de um adaptador com versão simulada. Os testes nunca usam rede.
- Commits pequenos, mensagem em português no imperativo ("Adiciona…", "Corrige…").
