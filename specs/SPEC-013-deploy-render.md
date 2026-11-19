# SPEC-013 · Publicar no Render

Responsável: José Felix · Revisor: Jackson · Gantt: 9 · Camada: integração

## Contexto
O Diagrama de Implantação descreve um Servidor de Aplicação (Render Web Service), um Servidor de Banco (Render PostgreSQL) e o front estático. Esta spec põe isso no ar para a apresentação, com plano gratuito.

## Arquivos
- CRIAR `render.yaml` na raiz (a partir de `modulo-5/entrega/render.yaml` do repositório da disciplina)
- CRIAR `backend/Dockerfile` (opcional, se o runtime Python do Render não servir)

## Requisitos
- **R1.** Serviço `maneja-api`: `cd backend && uv run uvicorn maneja.api:app --host 0.0.0.0 --port $PORT`, com o health check em `/saude`.
- **R2.** Site estático `maneja-web`: `npm ci && npm run build`, publicando `dist/`, com `VITE_API_URL` apontando para a API.
- **R3.** Variáveis secretas (`MANEJA_GEMINI_API_KEY`, `MANEJA_JWT_SEGREDO`) configuradas no painel do Render, nunca no repositório.
- **R4.** CORS da API liberado para o domínio do site (ajuste em `api.py` via `MANEJA_CORS_ORIGENS`).

## Cenários (aceite)
```gherkin
Funcionalidade: Deploy

  Cenário: API no ar
    Quando eu abro "https://<api>/saude"
    Então vejo status "ok"

  Cenário: Front no ar
    Quando eu abro o site
    Então o plano carrega da API
```

## Fora do escopo
Domínio próprio e CI/CD automatizado.
