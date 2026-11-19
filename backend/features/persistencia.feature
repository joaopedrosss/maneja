# language: pt
# Fonte: specs/SPEC-008-persistencia-postgres.md
Funcionalidade: Persistência em PostgreSQL

  Cenário: Banco vazio recebe a fazenda de demonstração
    Dado o sistema com PostgreSQL
    Então o banco tem 5 piquetes e 10 coleiras

  Cenário: Dados sobrevivem a reinício
    Dado o sistema com PostgreSQL
    E uma movimentação aceita do "Piquete Abóbora"
    Quando o sistema reinicia
    Então o histórico ainda tem a movimentação
    E o rebanho está no "Piquete Macarrão"

  Cenário: Rebanho se conserva ao aceitar
    Dado o sistema com PostgreSQL
    Quando aceito a movimentação do "Piquete Abóbora"
    E o sistema reinicia
    Então a soma do rebanho é igual à de antes

  Cenário: O campo também sobrevive a reinício
    Dado o sistema com PostgreSQL
    E uma movimentação aceita do "Piquete Abóbora"
    E o gado levado ao destino no campo
    Quando o sistema reinicia
    Então a verificação da movimentação é "cumprida"

  Cenário: Piquete criado pela API fica gravado
    Dado o sistema com PostgreSQL
    Quando eu crio o piquete "Piquete Novo" pela API
    E o sistema reinicia
    Então existe o "Piquete Novo"

  Cenário: Modo sem estado (Vercel) grava e lê do banco a cada requisição
    Dado a API sem estado ligada ao PostgreSQL
    Quando eu gero o plano pela API sem estado
    E aceito a movimentação do "Piquete Abóbora" pela API sem estado
    Então outra requisição já vê o rebanho no "Piquete Macarrão"

  Cenário: Coleiras não geram posição a cada requisição
    Dado a API sem estado ligada ao PostgreSQL
    Quando eu faço 5 requisições seguidas
    Então o banco tem 10 posições de coleira
