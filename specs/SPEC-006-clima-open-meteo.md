# SPEC-006 · Ligar a previsão do tempo real (Open-Meteo)

Responsável: Leo Lima · Revisor: Maria Antônia · Gantt: 6 · Camada DDD: support

## Contexto
Hoje o clima vem de `ClimaSimulado`. Esta spec cria o adaptador do Open-Meteo (gratuito, sem chave) para o centro da fazenda. Se a API falhar, o sistema usa a última previsão boa ou, sem ela, a simulada, e registra o aviso (critério de qualidade 1.1.4).

## Arquivos
- ALTERAR `backend/maneja/adaptadores/clima.py` (criar `ClimaOpenMeteo`)
- ALTERAR `backend/maneja/config.py` (`MANEJA_CLIMA=simulado|open-meteo`)
- CRIAR `backend/features/clima.feature`, `backend/tests/test_clima.py`

## Requisitos
- **R1.** `ClimaOpenMeteo(cliente_http).previsao(fazenda_id, lat, lon, hoje) -> PrevisaoClima`, via `GET https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&daily=precipitation_sum,temperature_2m_min,temperature_2m_max&timezone=America/Maceio&forecast_days=7`.
- **R2.** Cache em memória por 3 h. Uma falha devolve o cache. Sem cache, devolve `ClimaSimulado` e marca `fonte="simulado"`.
- **R3.** Acrescentar `fonte: str` e `consultado_em: str` em `PrevisaoClima` (o front mostra "desatualizada" se tiver mais de 12 h; critério 1.2).
- **R4.** Testes sem rede (`httpx.MockTransport`).

## Cenários (BDD)
```gherkin
Funcionalidade: Clima

  Cenário: Previsão real convertida
    Dado o Open-Meteo respondendo 7 dias com 50 mm no primeiro
    Quando o sistema pede a previsão
    Então a previsão tem 7 dias
    E o primeiro dia tem 50 mm

  Cenário: Falha usa a última previsão boa
    Dado uma previsão já consultada
    E o Open-Meteo fora do ar
    Quando o sistema pede a previsão
    Então a previsão é a anterior

  Cenário: Falha sem cache usa a simulada
    Dado o Open-Meteo fora do ar
    Quando o sistema pede a previsão
    Então a fonte é "simulado"
```

## Fora do escopo
Histórico de chuva. Previsão por piquete.
