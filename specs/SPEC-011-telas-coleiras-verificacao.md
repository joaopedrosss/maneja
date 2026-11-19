# SPEC-011 · Mostrar as coleiras e o planejado × realizado

Responsáveis: João Pedro e Maria Antônia · Revisor: Leandro · Gantt: 5, 8 · Camada DDD: support

## Contexto
É a parte que diferencia o Maneja: ver onde o gado está de fato e se o planejado aconteceu. A API já tem `/coleiras`, `/ocupacao`, `/verificacoes` e o simulador (SPEC-002, 003 e 004).

## Arquivos
- ALTERAR `src/paginas/Mapa.tsx` (camada de pontos das coleiras, com cor por categoria e alternável)
- CRIAR `src/paginas/Campo.tsx` (tabela de ocupação e lista de verificações)
- ALTERAR `src/App.tsx` e `src/componentes/Layout.tsx` (menu "Campo")

## Requisitos
- **R1.** Mapa: um ponto por coleira na última posição. Tooltip com id, categoria e o piquete do cadastro. Coleira fora do piquete do cadastro ganha borda vermelha.
- **R2.** Campo, ocupação: por piquete, as coleiras esperadas, as observadas e as sem sinal, com selo confere / diverge.
- **R3.** Campo, planejado × realizado: cada verificação com origem (Maneja ou SeuGado), status com cor, fração no destino e data.
- **R4.** Botões de demonstração, só com `VITE_MODO_DEMO=1`: "Levar gado no campo" (`POST /simulador/executar/{id}`, com escolha de piquete) e "Avançar 1 dia" (`POST /simulador/avancar`).

## Cenários (aceite manual, roteiro da demonstração)
```gherkin
Funcionalidade: Campo

  Cenário: Movimentação cumprida
    Dado uma movimentação aceita do Piquete Abóbora para o Piquete Macarrão
    Quando eu clico em "Levar gado no campo"
    Então os pontos das coleiras aparecem no Piquete Macarrão
    E a verificação muda para "cumprida"

  Cenário: Gado no lugar errado
    Dado uma movimentação aceita
    Quando eu levo o gado para outro piquete e avanço 2 dias
    Então a verificação fica "divergente"
    E a ocupação dos dois piquetes fica "diverge"
```

## Fora do escopo
Trajetos e animação.
