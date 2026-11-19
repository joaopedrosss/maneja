# Plano da AB2 · 19/11 a 26/11

## Marcos (agenda da AB2)

| Marco | Data | O que precisa estar pronto |
|---|---|---|
| Core (50%) | já apresentado em 10/11 | Protótipo navegável |
| Support (25%) | **seg 24/11** | API com agente, coleiras e planejado × realizado; front ligado à API; clima e Gemini reais |
| Generic (25%) | **seg 24/11** | Login, persistência, dashboard e histórico vindos da API, deploy |
| Apresentação final | **qui 26/11** | Demonstração ponta a ponta, mais os documentos SDD (CLAUDE.md, UML e specs) |

De 24/11 em diante, nenhuma funcionalidade nova entra: só correção e ensaio.

## Specs e responsáveis

Papéis da Gestão de RH: GER Jackson · FRN João Pedro · BCK Kauê · MID Maria Antônia · Dados Leo Lima · IA Leandro · Testes/Doc Júlia · Integração José Felix.

| Spec | O quê | Camada | Gantt | Responsável | Revisor | Prazo | Situação |
|---|---|---|---|---|---|---|---|
| SPEC-001 | Domínio, regras e agente (port do `agente.ts`) | Core | 6, 7 | Kauê | Leandro | 19/11 | ✅ feita |
| SPEC-002 | Coleiras simuladas e ocupação estimada | Support | 4, 5 | Kauê → Maria Antônia (evolução) | Maria Antônia | 19/11 | ✅ feita |
| SPEC-003 | Planejado × realizado | Core | 7, 9 | Kauê → José Felix (evolução) | José Felix | 19/11 | ✅ feita |
| SPEC-004 | API REST (leitura, ações e simulador) | Generic | 2, 8 | Kauê | João Pedro | 19/11 | ✅ feita |
| SPEC-005 | Gemini real escrevendo a explicação (com validador R3 e cota R7) | Core | 7 | Leandro | Kauê | 21/11 | a fazer |
| SPEC-006 | Clima real (Open-Meteo) com fallback | Support | 6 | Leo Lima | Maria Antônia | 21/11 | a fazer |
| SPEC-007 | NDVI real (Sentinel-2) com fallback simulado | Support | 5 | Maria Antônia | Leo Lima | 23/11 | a fazer · opcional |
| SPEC-008 | Persistência PostgreSQL | Generic | 2, 9 | Kauê | José Felix | 22/11 | a fazer |
| SPEC-009 | Autenticação (login e token) | Generic | 3 | Kauê | Júlia | 22/11 | ✅ feita |
| SPEC-010 | Front ligado à API, mantendo o modo demonstração | Generic | 3, 8 | Kauê | João Pedro | 22/11 | ✅ feita |
| SPEC-011 | Telas de coleiras e planejado × realizado | Support | 5, 8 | João Pedro e Maria Antônia | Leandro | 23/11 | a fazer |
| SPEC-012 | Integração SeuGado em modo `api` | Integração | 9 | José Felix | Kauê | 23/11 | a fazer |
| SPEC-013 | Deploy no Render (`render.yaml`) | Integração | 9 | José Felix | Jackson | 23/11 | a fazer |
| SPEC-014 | Documentação SDD: UML em `.md`, roteiro e slides finais | Doc | 11 | Jackson e Júlia | todos | 25/11 | em andamento |
| — | Rodada de testes BDD e defeitos (severidade 1 e 2 bloqueiam) | Teste | 10 | Júlia | — | 24/11 | a fazer |

## Semana

| Dia | Foco |
|---|---|
| qui 19 | Base SDD e backend core (SPEC-001 a 004). Trello reorganizado |
| sex 20 | PR da base revisado e mesclado. Cada pessoa lê a própria spec e abre o cartão em "Em andamento" |
| sáb 21 e dom 22 | SPEC-005, 006, 008, 009 e 010 |
| seg 23 | SPEC-011, 012 e 013. Primeiro fluxo ponta a ponta no ar |
| ter 24 | **Marco support/generic.** Congelar funcionalidades. Júlia roda os cenários e abre os defeitos |
| qua 25 | Correções, ensaio e vídeo de reserva da demonstração (risco "cota esgotada na apresentação") |
| qui 26 | Apresentação final |

## Trello

### Listas

1. **Visão geral:** um cartão com o resumo do projeto e links para o repositório, `CLAUDE.md` e este plano.
2. **Backlog:** specs ainda não começadas.
3. **A fazer (esta semana):** specs com responsável e prazo.
4. **Em andamento:** no máximo 1 cartão por pessoa.
5. **Em revisão / PR:** PR aberto, esperando o revisor.
6. **Concluído:** PR mesclado e cenários passando.
7. **Entregas AB1:** os cartões de documentos (EAP, DCU, DA, RACI, módulos 3 a 5), para tirar o ruído do quadro do projeto.

### Etiquetas

| Etiqueta | Cor | Uso |
|---|---|---|
| Core | vermelho | Agente, regras, planejado × realizado |
| Support | amarelo | NDVI, clima, coleiras, cadastros |
| Generic | verde | Login, persistência, dashboard, front |
| Integração | roxo | SeuGado, deploy |
| Doc | azul | UML, specs, apresentação |
| Bloqueado | preto | Esperando outra pessoa ou decisão |

### Cartão padrão

- **Título:** `SPEC-NNN · nome curto`.
- **Membros:** responsável e revisor.
- **Data de entrega:** o prazo da tabela.
- **Descrição:** link da spec no GitHub e a linha "Gantt: atividade N" (rastreabilidade com o cronograma).
- **Checklist "Pronto":** um item por cenário BDD da spec, mais "PR revisado" e "Mesclado na main".

### O que fazer com os cartões atuais

- Os cartões 1 a 11 (atividades do Gantt) viram referência. Cada um ganha na descrição a lista das specs que o cumprem e vai para "Concluído" quando todas as specs dele estiverem concluídas.
- O cartão 1 (Planejamento técnico e arquitetura) vai para "Concluído": os diagramas, o `CLAUDE.md` e as decisões já existem.
- Os cartões "Doc · …" e "Pendência · …" de "Concluído" vão para "Entregas AB1".
