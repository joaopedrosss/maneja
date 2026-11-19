# 5 · Componentes (DDD)

Mesmo desenho do módulo 5, mais `Coleiras`, `Verificacao` e o adaptador do SeuGado.

```mermaid
flowchart TB
    subgraph APP[Aplicações]
        WEB[AplicacaoWeb<br/>src/]
        API[API REST<br/>api.py]
    end
    subgraph CORE[Core]
        AG[AgenteDeManejo<br/>agente.py + regras.py]
        VER[Verificacao<br/>verificacao.py]
    end
    subgraph SUP[Support]
        MON[Monitoramento<br/>monitoramento.py + ndvi.py]
        CAD[Cadastros<br/>servico.py]
    end
    subgraph GEN[Generic]
        AUT[Autenticacao<br/>SPEC-009]
        DASH[HistoricoDashboard]
    end
    subgraph INF[Infra · adaptadores]
        REP[(Repositorio<br/>memória / PostgreSQL)]
        COL[Coleiras<br/>adaptadores/coleiras.py]
        CLI[Clima<br/>adaptadores/clima.py]
        LLM[LLM / Gemini<br/>adaptadores/llm.py]
        SG[SeuGado<br/>adaptadores/seugado.py]
    end

    WEB -- HTTP --> API
    API --> AG & VER & MON & CAD & AUT & DASH
    AG -- IClima --> CLI
    AG -- ILLM --> LLM
    VER -- ISeuGado --> SG
    MON -- IColeiras --> COL
    AG & VER & MON & CAD & DASH --> REP
```

| Componente | Camada | Fornece | Requer |
|---|---|---|---|
| AgenteDeManejo | core | `gerar_plano` | clima, LLM, repositório |
| Verificacao | core | `verificar`, `movimentacoes_externas` | coleiras (posições), SeuGado |
| Monitoramento | support | `ocupacao`, `resumo_piquetes` | coleiras, repositório |
| Cadastros | support | piquete, lotação | repositório |
| Adaptadores | infra | ISatelite, IClima, ILLM, IColeiras, ISeuGado | serviço externo ou simulação |
