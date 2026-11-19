# SPEC-004 · Expor a API REST

Responsável: Kauê · Revisor: João Pedro · Gantt: 2, 8 · Camada DDD: generic

## Contexto
A API em FastAPI expõe o que o front já usa no modo demonstração, mais coleiras, ocupação, planejado × realizado, o simulador do campo e o endpoint que o SeuGado consome. O JSON usa os nomes de campo de `src/lib/tipos.ts`, para a SPEC-010 trocar o mock pela API sem adaptação.

## Arquivos
- CRIAR `backend/maneja/servico.py` (orquestra repositório e adaptadores), `repositorio.py`, `demo.py`, `config.py`, `api.py`, `adaptadores/clima.py`, `adaptadores/llm.py`
- CRIAR `backend/features/api.feature`, `backend/tests/test_api.py`

## Requisitos
- **R1. Endpoints.**

| Método | Caminho | Resposta |
|---|---|---|
| GET | `/saude` | `{"status": "ok", "modo_seugado": "..."}` |
| GET | `/fazenda` | `Fazenda` |
| GET / POST | `/piquetes` | `Piquete[]` / `Piquete` criado. Polígono com menos de 3 pontos distintos dá **422** |
| GET | `/lotacao` · PUT `/lotacao/{piquete_id}` | `Lotacao[]` / `Lotacao`. Quantidade negativa ou não inteira dá **422** |
| GET | `/ndvi` | `LeituraNdvi[]` |
| GET | `/clima` | `PrevisaoClima` |
| GET | `/resumo` | `ResumoPiquete[]` |
| POST | `/plano` · GET `/plano` | `PlanoManejo` gerado agora / último plano |
| POST | `/movimentacoes/{id}/aceitar` | Corpo opcional `{"destino_id": "..."}`. Destino reprovado nas regras dá **422** com os motivos. Movimentação que não está pendente dá **409** |
| POST | `/movimentacoes/{id}/recusar` | `Movimentacao` |
| GET | `/historico` | `Movimentacao[]` |
| GET | `/coleiras` · GET `/ocupacao` | coleiras com a última posição / `OcupacaoPiquete[]` |
| GET | `/verificacoes` | `{"verificacoes": [...], "avisos": [...]}` |
| POST | `/simulador/avancar` | `{"horas": n}`: avança o relógio e gera posições |
| POST | `/simulador/executar/{mov_id}` | `{"piquete_id": opcional}`: leva o gado no campo |
| GET | `/integracao/v1/execucoes?desde=AAAA-MM-DD` | contrato de `docs/02-integracao-seugado.md` |

- **R2. Configuração** por variável de ambiente (`config.py`): `MANEJA_SEUGADO_MODO`, `MANEJA_SEUGADO_ARQUIVO`, `MANEJA_PERDA_SINAL`, `MANEJA_SEMENTE`.
- **R3.** O app sobe com a fazenda de demonstração (mesmos dados de `src/lib/demo.ts`) e com 10 coleiras: 6 no Abóbora e 4 no Milho.
- **R4.** CORS liberado para `http://localhost:5173`.

## Cenários (BDD)

```gherkin
Funcionalidade: API

  Cenário: A API está no ar
    Quando eu consulto "/saude"
    Então a resposta é 200

  Cenário: Polígono inválido é rejeitado
    Quando eu crio um piquete com 2 pontos
    Então a resposta é 422

  Cenário: Fluxo completo do manejo
    Quando eu gero o plano
    E aceito a movimentação do "Piquete Abóbora"
    E o gado é levado no campo
    E eu consulto as verificações
    Então a movimentação aparece como "cumprida"

  Cenário: Destino reprovado nas regras
    Quando eu gero o plano
    E aceito a movimentação do "Piquete Abóbora" trocando o destino para "Piquete Milho"
    Então a resposta é 422

  Cenário: O SeuGado consulta as execuções
    Dado a integração com o SeuGado em modo arquivo
    Quando eu consulto "/integracao/v1/execucoes?desde=2000-01-01"
    Então a resposta é 200
    E cada item tem "movimentacao_externa_id" e "status"
```

## Fora do escopo
Autenticação (SPEC-009), banco (SPEC-008) e deploy (SPEC-013).
