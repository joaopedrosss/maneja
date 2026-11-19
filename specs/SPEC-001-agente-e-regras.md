# SPEC-001 · Implementar o agente de manejo e as regras no backend

Responsável: Kauê · Revisor: Leandro · Gantt: 6, 7 · Camada DDD: core

## Contexto
O front tem um agente de demonstração em `src/lib/agente.ts` e as validações em `src/lib/regras.ts`. Esta spec leva a mesma lógica para o backend em Python, que passa a ser a fonte da verdade. A decisão é sempre das regras. Um modelo de linguagem pode **escrever a explicação**, mas o texto que contradiz a decisão é descartado (risco R3).

## Arquivos
- CRIAR `backend/maneja/dominio.py`, `datas.py`, `geo.py`, `regras.py`, `ndvi.py`, `agente.py`
- CRIAR `backend/features/agente.feature`, `backend/tests/test_agente.py`

## Requisitos
- **R1. Tipos.** `dominio.py` reproduz os tipos de `src/lib/tipos.ts`, com os mesmos nomes de campo. A `Movimentacao` ganha `explicacao`, `explicacao_origem` (`"regra"` ou `"llm"`), `coleiras` (lista de ids), `origem_plano` (`"maneja"` ou `"seugado"`) e `externo_id`. O `Piquete` ganha `externo_id` (opcional).
- **R2. Regras.** `validar_movimento(destino_id, rebanho, piquetes, ndvi, lotacao, hoje) -> list[str]`, com as mesmas quatro regras e mensagens de `regras.ts`. Lista vazia significa aprovado.
- **R3. Agente.** `gerar_plano(entrada, hoje, agora, llm=None) -> PlanoManejo`, com o mesmo algoritmo de `gerarRecomendacao`:
  - fila pelo NDVI mais baixo;
  - candidatos livres pelo NDVI mais alto;
  - rota recusada nos últimos 7 dias pulada;
  - dia de chuva forte adiado;
  - alertas de falta de capim, passando do ponto, pronto para pastejo e clima.
- **R4. Explicação.** Com `llm` informado, o agente monta um prompt com os fatos e pede o texto. O texto só é aceito se citar o nome do piquete de origem e o do destino e tiver até 400 caracteres. Caso contrário, `explicacao = motivo` e `explicacao_origem = "regra"`. Sem `llm`, vale sempre o motivo.
- **R5. Interface do LLM.** `ILLM.gerar_texto(prompt: str) -> str`. Se o LLM lançar `CotaEsgotada`, usa o motivo, sem interromper o plano (risco R7).

## Constantes (iguais ao front, todas "a validar")

`NDVI_SAIDA = 0.35`, `NDVI_FALTA = 0.30`, `NDVI_PASSANDO = 0.80`, `NDVI_MINIMO_DESTINO = 0.50`, `UA_MAX_POR_HA = 6`, UA por categoria `bois 1 · vacas 1 · bezerros 0.4`, `CHUVA_FORTE_MM = 40`, `SEMANA_SECA_MM = 5`, `RECUSA_VALE_DIAS = 7`. Confiança: leitura de até 7 dias é alta, até 14 é média, acima disso é baixa.

## Cenários (BDD)

```gherkin
Funcionalidade: Agente de manejo

  Cenário: Piquete degradado gera recomendação para o melhor destino apto
    Dado a fazenda de demonstração
    Quando o agente gera o plano
    Então há uma movimentação de "Piquete Abóbora" para "Piquete Macarrão"
    E o motivo explica que "Piquete Jerimum" foi descartado porque o rebanho não cabe

  Cenário: Sem destino apto vira alerta
    Dado a fazenda de demonstração
    E todos os piquetes livres com NDVI 0,40
    Quando o agente gera o plano
    Então não há movimentação
    E há um alerta "sem_piquete_apto"

  Cenário: Chuva forte adia a movimentação
    Dado a fazenda de demonstração
    E chuva de 50 mm hoje
    Quando o agente gera o plano
    Então a movimentação fica para amanhã

  Cenário: Rota recusada há pouco não volta
    Dado a fazenda de demonstração
    E a rota "Piquete Abóbora" para "Piquete Macarrão" recusada há 3 dias
    Quando o agente gera o plano
    Então a movimentação não vai para "Piquete Macarrão"

  Cenário: Texto do LLM que contradiz a regra é descartado
    Dado a fazenda de demonstração
    E um LLM que responde "Mantenha o gado onde está."
    Quando o agente gera o plano
    Então a explicação da movimentação vem da regra

  Cenário: Texto do LLM coerente é usado
    Dado a fazenda de demonstração
    E um LLM que responde "Tire o gado do Piquete Abóbora e leve para o Piquete Macarrão, que tem mais pasto."
    Quando o agente gera o plano
    Então a explicação da movimentação vem do LLM
```

## Fora do escopo
Chamar o Gemini de verdade (SPEC-005). Persistência (SPEC-008). Qualquer mudança no front.
