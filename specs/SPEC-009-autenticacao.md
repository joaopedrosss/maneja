# SPEC-009 · Exigir login

Responsável: Kauê (API) e João Pedro (tela) · Revisora: Júlia · Gantt: 3 · Camada DDD: generic

## Contexto
Critério de qualidade 4.2: nenhuma rota de dados responde sem token válido, e token expirado devolve 401. O MVP tem um usuário por fazenda, configurado por ambiente.

## Arquivos
- CRIAR `backend/maneja/autenticacao.py`
- ALTERAR `backend/maneja/api.py` (`POST /auth/token`, dependência em todas as rotas, menos `/saude`)
- CRIAR `src/paginas/Login.tsx` e ALTERAR `src/App.tsx`
- CRIAR `backend/features/autenticacao.feature`, `backend/tests/test_autenticacao.py`

## Requisitos
- **R1.** `POST /auth/token {email, senha}` devolve `{access_token, expira_em}`. O token é JWT HS256 (`MANEJA_JWT_SEGREDO`) e vale 8 h. A senha é comparada com o hash PBKDF2 em `MANEJA_USUARIO_SENHA_HASH`.
- **R2.** Sem token ou com token expirado: 401. `/integracao/v1/*` aceita também um token de serviço fixo (`MANEJA_TOKEN_INTEGRACAO`), para o SeuGado.
- **R3.** O front guarda o token, redireciona para o login no 401 e mostra o erro de senha.

## Cenários (BDD)
```gherkin
Funcionalidade: Autenticação

  Cenário: Rota sem token
    Quando eu consulto "/piquetes" sem token
    Então a resposta é 401

  Cenário: Login válido
    Quando eu faço login com a senha certa
    E consulto "/piquetes" com o token
    Então a resposta é 200

  Cenário: Token expirado
    Dado um token emitido há 9 horas
    Quando eu consulto "/piquetes" com o token
    Então a resposta é 401
```

## Fora do escopo
Cadastro de usuário, recuperação de senha e papéis.
