# SPEC-013 · Publicar na Vercel com o banco no Supabase

Responsável: Kauê · Revisor: Jackson · Gantt: 9 · Camada: integração

> Mudou em 19/11 (decisão D11): o alvo era o Render; agora é a Vercel (front e API) com o Supabase (banco), a mesma infraestrutura do SeuGado, que o Kauê já opera. Continua em plano gratuito, então o custo de hospedagem do MVP segue R$ 0.

## Contexto
Pôr o Maneja no ar para a apresentação: o front estático e a API Python na Vercel, e o PostgreSQL no Supabase. Na Vercel cada requisição pode cair numa instância nova, então a API precisa de um modo **sem estado**.

## Arquivos
- CRIAR `backend/index.py` (entrada da Vercel), `backend/vercel.json`, `backend/requirements.txt` (`uv export --no-dev`), `vercel.json` (rewrite do front) e `docs/04-deploy.md` (passo a passo)
- ALTERAR `backend/maneja/api.py` (modo sem estado e CORS por variável), `config.py`, `repositorio_pg.py` (pooler do Supabase e só posições recentes) e `servico.py` (`atualizar_coleiras`)

## Requisitos
- **R1. Modo sem estado.** Com `MANEJA_SEM_ESTADO=1` (ligado sozinho quando existe a variável `VERCEL`), cada requisição monta o `Sistema` a partir do banco. As operações que mudam dados gravam antes de responder. Exige `DATABASE_URL`.
- **R2. Supabase.** As conexões usam `prepare_threshold=None`, que o pooler de transação (porta 6543) exige. O schema só é aplicado se faltar tabela. Só as posições das últimas 24 h são carregadas.
- **R3. Coleiras.** Reportam a cada 10 min de tempo simulado (`INTERVALO_COLEIRA_MIN`). Requisições seguidas não geram posições novas.
- **R4. CORS.** Por `MANEJA_CORS_ORIGENS` (separado por vírgula).
- **R5. Segredos.** `DATABASE_URL`, `MANEJA_JWT_SEGREDO` e `MANEJA_USUARIO_SENHA_HASH` ficam só no painel da Vercel, nunca no repositório.

## Cenários (BDD)
```gherkin
  Cenário: Modo sem estado (Vercel) grava e lê do banco a cada requisição
    Dado a API sem estado ligada ao PostgreSQL
    Quando eu gero o plano pela API sem estado
    E aceito a movimentação do "Piquete Abóbora" pela API sem estado
    Então outra requisição já vê o rebanho no "Piquete Macarrão"

  Cenário: Coleiras não geram posição a cada requisição
    Dado a API sem estado ligada ao PostgreSQL
    Quando eu faço 5 requisições seguidas
    Então o banco tem 10 posições de coleira
```
(estão em `backend/features/persistencia.feature`)

## Aceite manual
O checklist da seção 5 de `docs/04-deploy.md`.

## Fora do escopo
CI/CD além da integração da Vercel com o GitHub. Migrações versionadas. Gravação por linha (hoje vale a última gravação, o que basta para a demonstração).

## Situação
Código pronto em 19/11 (Kauê): 39 cenários. **Falta a parte que depende da conta do Kauê:** criar o projeto no Supabase, importar os dois projetos na Vercel e configurar as variáveis (`docs/04-deploy.md`).
