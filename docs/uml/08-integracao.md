# 8 · Integração com o SeuGado

Dois sistemas independentes: cada seta é opcional. Detalhes do contrato em `docs/02-integracao-seugado.md`.

```mermaid
sequenceDiagram
    participant SG as SeuGado (decide)
    participant P as Pecuarista (Telegram)
    participant M as Maneja (observa)
    participant C as Coleiras

    SG->>P: ordem do dia: mover Lote Recria para o Macarrão
    M->>SG: GET /fazendas/{id}/plano/atual
    SG-->>M: plano vigente
    M->>M: guarda as coleiras do grupo (quem está na origem)
    P->>P: leva o gado
    C->>M: posições
    M->>M: verificar() → cumprida
    SG->>M: GET /integracao/v1/execucoes
    M-->>SG: cumprida (fração 0,83, 6 coleiras)
    SG->>SG: confirma a execução sem esperar o toque "Fiz"
```

Código: `adaptadores/seugado.py`, `verificacao.movimentacoes_externas`, `servico.execucoes`.
