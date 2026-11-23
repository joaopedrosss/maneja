# 6 · Implantação

```mermaid
flowchart LR
    subgraph PC[device · Computador / celular]
        NAV[Navegador<br/>maneja-web]
    end
    subgraph R1[Vercel · site estático]
        WEBA[maneja-web · dist/]
    end
    subgraph R2[Vercel Functions · Python 3.12 · gru1]
        APIA[maneja-api · FastAPI, modo sem estado]
    end
    subgraph R3[Supabase · PostgreSQL · São Paulo]
        DB[(postgres, via pooler 6543)]
    end
    GEM[Google Gemini API]
    OM[Open-Meteo]
    CDSE[Copernicus · Sentinel-2]
    SEU[SeuGado / PiqueTech API · opcional]
    COLE[Coleiras GPS · simuladas no MVP]

    NAV -- HTTPS --> WEBA
    NAV -- HTTPS REST + token --> APIA
    APIA -- TCP 6543 · pooler --> DB
    APIA -- HTTPS --> GEM & OM & CDSE
    APIA <-->|HTTPS · contrato docs/02| SEU
    COLE -- HTTPS POST /coleiras/posicoes --> APIA
```

Código: `backend/index.py`, `backend/vercel.json`, `vercel.json` (SPEC-013), `backend/maneja/config.py`. Passo a passo em `docs/04-deploy.md`. (Até 19/11 o alvo era o Render; ver a decisão D11.)
