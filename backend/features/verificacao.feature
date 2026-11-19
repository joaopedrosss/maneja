# language: pt
# Fonte: specs/SPEC-003-planejado-x-realizado.md
Funcionalidade: Planejado × realizado

  Cenário: Gado levado ao destino
    Dado uma movimentação aceita do "Piquete Abóbora" para o "Piquete Macarrão"
    E o gado levado ao "Piquete Macarrão" no campo
    Quando o sistema verifica a movimentação
    Então o status é "cumprida"

  Cenário: Ainda dentro do prazo
    Dado uma movimentação aceita do "Piquete Abóbora" para o "Piquete Macarrão"
    Quando o sistema verifica a movimentação
    Então o status é "pendente"

  Cenário: Prazo vencido com o gado em outro piquete
    Dado uma movimentação aceita do "Piquete Abóbora" para o "Piquete Macarrão"
    E o gado levado ao "Piquete Feijão" no campo
    E passaram 2 dias
    Quando o sistema verifica a movimentação
    Então o status é "divergente"

  Cenário: Coleiras sem sinal
    Dado uma movimentação aceita do "Piquete Abóbora" para o "Piquete Macarrão"
    E todas as coleiras sem sinal
    Quando o sistema verifica a movimentação
    Então o status é "sem_dados"

  Cenário: Plano do SeuGado vira o planejado
    Dado a integração com o SeuGado em modo arquivo
    E o gado levado ao "Piquete Macarrão" no campo
    Quando o sistema verifica as movimentações
    Então a movimentação do SeuGado aparece como "cumprida"

  Cenário: Maneja funciona com a integração desligada
    Dado a integração com o SeuGado desligada
    Quando o sistema verifica as movimentações
    Então nenhuma verificação vem do SeuGado
    E não há aviso de plano externo
