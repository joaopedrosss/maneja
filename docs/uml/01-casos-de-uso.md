# 1 · Casos de uso

Atores: **Técnico/gestor** (usa o painel), **Agendador** (rotina), **Coleira GPS** (envia posições), **SeuGado** (sistema externo, opcional).

```mermaid
flowchart LR
    tecnico([👤 Técnico / gestor])
    agendador([⏱ Agendador])
    coleira([📡 Coleira GPS])
    seugado([🧠 SeuGado · opcional])

    subgraph Maneja
        uc1((Fazer login))
        uc2((Cadastrar piquete no mapa))
        uc3((Cadastrar rebanho por categoria))
        uc4((Gerar plano de manejo))
        uc5((Aceitar, trocar ou recusar movimentação))
        uc6((Ver ocupação pelas coleiras))
        uc7((Ver planejado × realizado))
        uc8((Ver dashboard e histórico))
        uc9((Atualizar NDVI e clima))
        uc10((Registrar posição))
        uc11((Consultar execuções))
        uc12((Ler plano externo))
    end

    tecnico --- uc1 & uc2 & uc3 & uc4 & uc5 & uc6 & uc7 & uc8
    agendador --- uc9
    coleira --- uc10
    seugado --- uc11
    uc7 -. inclui .-> uc12
    uc4 -. inclui .-> uc9
```

Código: `backend/maneja/api.py` (um endpoint por caso de uso) e `src/paginas/`.
