# language: pt
# Fonte: specs/SPEC-001-agente-e-regras.md
Funcionalidade: Agente de manejo

  Cenário: Piquete degradado gera recomendação para o melhor destino apto
    Dado a fazenda de demonstração
    Quando o agente gera o plano
    Então há uma movimentação de "Piquete Abóbora" para "Piquete Macarrão"
    E o motivo explica que "Piquete Jerimum" foi descartado porque o rebanho não cabe

  Cenário: Sem destino apto vira alerta
    Dado a fazenda de demonstração
    E todos os piquetes livres com NDVI 0,40
    Quando o agente gera o plano
    Então não há movimentação
    E há um alerta "sem_piquete_apto"

  Cenário: Chuva forte adia a movimentação
    Dado a fazenda de demonstração
    E chuva de 50 mm hoje
    Quando o agente gera o plano
    Então a movimentação fica para amanhã

  Cenário: Rota recusada há pouco não volta
    Dado a fazenda de demonstração
    E a rota "Piquete Abóbora" para "Piquete Macarrão" recusada há 3 dias
    Quando o agente gera o plano
    Então a movimentação não vai para "Piquete Macarrão"

  Cenário: Texto do LLM que contradiz a regra é descartado
    Dado a fazenda de demonstração
    E um LLM que responde "Mantenha o gado onde está."
    Quando o agente gera o plano
    Então a explicação da movimentação vem da regra

  Cenário: Texto do LLM coerente é usado
    Dado a fazenda de demonstração
    E um LLM que responde "Tire o gado do Piquete Abóbora e leve para o Piquete Macarrão, que tem mais pasto."
    Quando o agente gera o plano
    Então a explicação da movimentação vem do LLM
