# language: pt
# Fonte: specs/SPEC-004-api-rest.md
Funcionalidade: API

  Cenário: A API está no ar
    Quando eu consulto "/saude"
    Então a resposta é 200

  Cenário: Polígono inválido é rejeitado
    Quando eu crio um piquete com 2 pontos
    Então a resposta é 422

  Cenário: Fluxo completo do manejo
    Quando eu gero o plano
    E aceito a movimentação do "Piquete Abóbora"
    E o gado é levado no campo
    E eu consulto as verificações
    Então a movimentação aparece como "cumprida"

  Cenário: Destino reprovado nas regras
    Quando eu gero o plano
    E aceito a movimentação do "Piquete Abóbora" trocando o destino para "Piquete Milho"
    Então a resposta é 422

  Cenário: O SeuGado consulta as execuções
    Dado a integração com o SeuGado em modo arquivo
    Quando eu consulto "/integracao/v1/execucoes?desde=2000-01-01"
    Então a resposta é 200
    E cada item tem "movimentacao_externa_id" e "status"
