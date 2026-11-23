# SPEC-002 · Simular as coleiras GPS e estimar a ocupação

Responsável: Kauê (base) → Maria Antônia (evolução) · Revisor: Maria Antônia · Gantt: 4, 5 · Camada DDD: support

## Contexto
No MVP as coleiras são simuladas (Quadro de Custos: 10 coleiras de um lote piloto, sem compra). Cada coleira está ligada a um animal de uma categoria e a um piquete **do cadastro**. O simulador sabe onde o animal **está de fato** e gera posições dentro desse piquete. A ocupação estimada compara as coleiras esperadas em cada piquete (cadastro) com as observadas (GPS). É isso que o SeuGado não tem.

## Arquivos
- CRIAR `backend/maneja/monitoramento.py` (ocupação), `backend/maneja/adaptadores/coleiras.py` (simulador)
- CRIAR `backend/features/coleiras.feature`, `backend/tests/test_coleiras.py`

## Requisitos
- **R1. Tipos.**
  - `Coleira(id, categoria, piquete_cadastro_id)`;
  - `Posicao(coleira_id, instante, lat, lon)`;
  - `OcupacaoPiquete(piquete_id, nome, coleiras_esperadas, coleiras_observadas, sem_sinal, situacao)`, com `situacao` em `"confere" | "diverge" | "sem_coleiras"`.
- **R2. Simulador.** `SimuladorColeiras(coleiras, piquetes, perda_sinal=0.1, semente)`.
  - `gerar_posicoes(instante) -> list[Posicao]`: uma posição por coleira, sorteada dentro do piquete físico. Com probabilidade `perda_sinal`, a coleira fica sem posição.
  - `mover(coleira_ids, piquete_id)`: muda o piquete físico, ou seja, o gado foi levado no campo.
- **R3. Leitura.** `registrar_posicoes(posicoes)` rejeita posição de coleira desconhecida com `ColeiraDesconhecida`. A posição nunca é criada em silêncio (critério 2.1.1).
- **R4. Ocupação.** `ocupacao(piquetes, coleiras, posicoes, agora) -> list[OcupacaoPiquete]`. Usa a última posição de cada coleira dentro da janela de 6 h:
  - esperadas: coleiras com `piquete_cadastro_id` igual ao piquete;
  - observadas: coleiras cuja última posição cai dentro do polígono;
  - sem sinal: esperadas sem posição na janela.

## Constantes
`JANELA_RECENTE_H = 6`, `PERDA_SINAL_PADRAO = 0.1` (a validar com a ficha da coleira).

## Cenários (BDD)

```gherkin
Funcionalidade: Coleiras e ocupação

  Cenário: Posições simuladas caem dentro do piquete
    Dado uma coleira no "Piquete Abóbora"
    Quando o simulador gera 1000 posições
    Então pelo menos 75% delas estão dentro do "Piquete Abóbora"

  Cenário: Leitura de coleira desconhecida é rejeitada
    Dado a fazenda de demonstração
    Quando chega uma posição da coleira "col-99"
    Então a leitura é rejeitada

  Cenário: Ocupação confere com o cadastro
    Dado a fazenda de demonstração sem perda de sinal
    Quando o simulador gera as posições de agora
    Então a ocupação do "Piquete Abóbora" confere

  Cenário: Gado fora do lugar do cadastro gera divergência
    Dado a fazenda de demonstração sem perda de sinal
    E as coleiras do "Piquete Abóbora" levadas para o "Piquete Feijão" no campo
    Quando o simulador gera as posições de agora
    Então a ocupação do "Piquete Abóbora" diverge
    E o "Piquete Feijão" tem coleiras observadas sem rebanho cadastrado
```

## Fora do escopo
Coleira real e protocolo de rádio. Histórico de trajetos. Posição por animal no mapa (SPEC-011).
