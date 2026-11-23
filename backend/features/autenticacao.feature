# language: pt
# Fonte: specs/SPEC-009-autenticacao.md
Funcionalidade: Autenticação

  Cenário: Rota de dados sem token
    Quando eu consulto "/piquetes" sem token
    Então a resposta é 401

  Cenário: Saúde não exige login
    Quando eu consulto "/saude" sem token
    Então a resposta é 200

  Cenário: Login com a senha certa
    Quando eu faço login com a senha certa
    E consulto "/piquetes" com o token
    Então a resposta é 200

  Cenário: Login com a senha errada
    Quando eu faço login com a senha "chute"
    Então a resposta é 401

  Cenário: Token expirado
    Dado um token emitido há 9 horas
    Quando eu consulto "/piquetes" com o token
    Então a resposta é 401

  Cenário: Token adulterado
    Dado um token com a assinatura trocada
    Quando eu consulto "/piquetes" com o token
    Então a resposta é 401

  Cenário: O SeuGado usa o token de integração
    Quando o SeuGado consulta "/integracao/v1/execucoes?desde=2000-01-01" com o token de integração
    Então a resposta é 200

  Cenário: O token de integração não abre as rotas de dados
    Quando o SeuGado consulta "/piquetes" com o token de integração
    Então a resposta é 401
