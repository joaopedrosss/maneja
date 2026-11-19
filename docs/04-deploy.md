# Deploy: Vercel (front e API) + Supabase (banco)

Dois projetos na Vercel, ligados ao mesmo repositório (o `main` do fork `kaeffea/maneja`), e um projeto no Supabase. Tudo em plano gratuito.

```
navegador ──HTTPS──▶ maneja-web (Vercel, estático)      app.maneja.com.br
          ──HTTPS──▶ maneja-api (Vercel, Python, gru1)   api.maneja.com.br
                         └── TCP 6543 (pooler) ──▶ Supabase PostgreSQL (São Paulo)
```

## 1. Supabase (banco)

1. Em https://supabase.com, crie um projeto: **New project → nome `maneja`, região South America (São Paulo)**. Guarde a senha do banco no seu gerenciador de senhas.
2. Em **Connect → Transaction pooler**, copie a URI. Ela tem a porta **6543** e o formato `postgresql://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`.
3. Não é preciso criar tabelas: a API aplica `backend/db/schema.sql` sozinha na primeira requisição. Com `MANEJA_SEMEAR=1` (o padrão), ela também carrega a fazenda de demonstração.

> Por que o pooler de transação: na Vercel cada requisição abre uma conexão. O pooler aguenta isso, e o backend já desliga os prepared statements (`prepare_threshold=None`), que esse modo não aceita.

## 2. Vercel: API (`maneja-api`)

1. Em https://vercel.com/new, importe o repositório `kaeffea/maneja`.
2. **Root Directory: `backend`**. Framework: Other. A Vercel encontra o `index.py` e o `requirements.txt` sozinha.
3. Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a URI do pooler do Supabase (passo 1.2) |
| `MANEJA_JWT_SEGREDO` | um texto aleatório longo (gere com `openssl rand -hex 32`) |
| `MANEJA_USUARIO_EMAIL` | o e-mail de login do sistema |
| `MANEJA_USUARIO_SENHA_HASH` | o hash da senha. Gere com: `cd backend && uv run python -c "from maneja.autenticacao import hash_senha; import getpass; print(hash_senha(getpass.getpass()))"` |
| `MANEJA_CORS_ORIGENS` | os endereços do front, separados por vírgula: `https://maneja-web.vercel.app,https://app.maneja.com.br` |
| `MANEJA_TOKEN_INTEGRACAO` | (opcional) token que o SeuGado usa em `/integracao/v1/*` |
| `MANEJA_SEUGADO_MODO` | (opcional) `desligado` (padrão), `arquivo` ou `api` |

4. Faça o deploy e confira em `https://<api>/saude`. A resposta deve ser `{"status": "ok", "banco": "postgresql", "sem_estado": true, ...}`.

> **Modo sem estado.** Na Vercel (variável `VERCEL` presente), cada requisição monta o sistema a partir do banco e grava de volta. Duas alterações simultâneas: vale a última. Isso basta para a demonstração; uma gravação por linha fica como melhoria futura.

## 3. Vercel: front (`maneja-web`)

1. Importe o mesmo repositório de novo, como outro projeto.
2. **Root Directory: `.`** (a raiz). Framework: Vite. Build: `npm run build`. Saída: `dist`.
3. Variável: `VITE_API_URL` = o endereço da API (`https://maneja-api.vercel.app` ou `https://api.maneja.com.br`).
4. O `vercel.json` da raiz faz o rewrite das rotas do React (`/mapa`, `/plano`...) para `index.html`.

## 4. Domínio (opcional)

Sugestão: **`maneja.com.br`** no Registro.br (cerca de R$ 40/ano). É o item AQ-06 do Quadro de Aquisições, então bate com o orçamento da AB1.
- Antes de comprar, confira se está livre em https://registro.br.
- Na Vercel, adicione `app.maneja.com.br` no projeto web e `api.maneja.com.br` no projeto da API. Depois, crie no DNS os registros CNAME que a Vercel mostrar.
- Depois do domínio, atualize `MANEJA_CORS_ORIGENS` e `VITE_API_URL`.

## 5. Conferência (aceite da SPEC-013)

- [ ] `https://<api>/saude` responde `ok` com `banco: postgresql`.
- [ ] O site abre, pede login e, depois de entrar, mostra o mapa com os 5 piquetes.
- [ ] Gerar plano e confirmar; recarregar a página: o rebanho continua no destino (o dado está no Supabase).
