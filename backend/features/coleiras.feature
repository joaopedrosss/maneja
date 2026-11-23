# language: pt
# Fonte: specs/SPEC-002-coleiras-e-ocupacao.md
Funcionalidade: Coleiras e ocupação

  Cenário: Posições simuladas caem dentro do piquete
    Dado uma coleira no "Piquete Abóbora"
    Quando o simulador gera 1000 posições
    Então pelo menos 75% delas estão dentro do "Piquete Abóbora"

  Cenário: Leitura de coleira desconhecida é rejeitada
    Dado a fazenda de demonstração
    Quando chega uma posição da coleira "col-99"
    Então a leitura é rejeitada

  Cenário: Ocupação confere com o cadastro
    Dado a fazenda de demonstração sem perda de sinal
    Quando o simulador gera as posições de agora
    Então a ocupação do "Piquete Abóbora" confere

  Cenário: Gado fora do lugar do cadastro gera divergência
    Dado a fazenda de demonstração sem perda de sinal
    E as coleiras do "Piquete Abóbora" levadas para o "Piquete Feijão" no campo
    Quando o simulador gera as posições de agora
    Então a ocupação do "Piquete Abóbora" diverge
    E o "Piquete Feijão" tem coleiras observadas sem rebanho cadastrado
