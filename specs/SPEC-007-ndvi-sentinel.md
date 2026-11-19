# SPEC-007 · NDVI real por satélite (opcional)

Responsável: Maria Antônia · Revisor: Leo Lima · Gantt: 5 · Camada DDD: support

## Contexto
As leituras de NDVI hoje são a série da demonstração. Esta spec cria um adaptador `ISatelite.ndvi(piquete, data) -> LeituraNdvi | None` usando a Sentinel Hub Statistical API do Copernicus Data Space (conta gratuita), com descarte de nuvem (risco R6). **É opcional:** se a conta ou o tempo não derem, a demonstração segue com a série simulada.

## Arquivos
- CRIAR `backend/maneja/adaptadores/satelite.py` (`SateliteSimulado`, `SateliteCopernicus`)
- ALTERAR `backend/maneja/servico.py` (método `atualizar_ndvi()` e endpoint `POST /ndvi/atualizar` em `api.py`)
- CRIAR `backend/features/ndvi.feature`, `backend/tests/test_ndvi.py`

## Requisitos
- **R1.** Média do NDVI no polígono do piquete com máscara de nuvem (SCL). Imagem com mais de 30% de nuvem é descartada e vale a última leitura limpa (risco R6).
- **R2.** Leitura nova é acrescentada em `repo.ndvi`. Nunca apaga a série.
- **R3.** Credenciais por ambiente (`MANEJA_CDSE_CLIENT_ID`, `MANEJA_CDSE_CLIENT_SECRET`). Sem elas, usa `SateliteSimulado`.
- **R4.** Testes sem rede.

## Cenários (BDD)
```gherkin
Funcionalidade: NDVI por satélite

  Cenário: Imagem limpa vira leitura
    Dado um satélite que devolve NDVI 0,61 com 5% de nuvem
    Quando o sistema atualiza o NDVI do "Piquete Feijão"
    Então a última leitura do "Piquete Feijão" é 0,61

  Cenário: Imagem nublada é descartada
    Dado um satélite que devolve NDVI 0,20 com 80% de nuvem
    Quando o sistema atualiza o NDVI do "Piquete Feijão"
    Então a última leitura do "Piquete Feijão" continua a anterior
```

## Fora do escopo
Mapa de calor dentro do piquete. Outros índices além do NDVI.
