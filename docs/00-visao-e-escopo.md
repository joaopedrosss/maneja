# Visão e escopo

## Uma frase

O Maneja mostra ao técnico ou gestor da fazenda **como está cada piquete e onde o gado está de fato**, recomenda as movimentações do manejo rotacionado e **confere se elas aconteceram**.

## Problema

No manejo rotacionado, a decisão de mover o gado depende do estado do pasto, e quase nunca há registro confiável do que foi feito. O gestor não sabe se o lote saiu na data, se foi para o piquete certo, nem como o pasto respondeu depois.

## O que o sistema faz (MVP, 26/11)

| Pilar da EAP | Funcionalidade | Camada DDD |
|---|---|---|
| 1. Manejo inteligente | Agente: detecta piquete com NDVI baixo, escolhe o destino por regras, considera a chuva e explica com o Gemini | Core |
| 1. Manejo inteligente | Planejado × realizado: compara a recomendação aceita (ou o plano do SeuGado) com as coleiras | Core |
| 2. Monitoramento | NDVI por piquete, com série semanal (satélite simulado e adaptador real) | Support |
| 2. Monitoramento | Coleiras GPS simuladas, localização e estimativa de ocupação por piquete | Support |
| 3. Cadastros | Piquete desenhado no mapa, rebanho por categoria (bois, vacas, bezerros) e vegetação | Support |
| 4. Funcionalidades genéricas | Login, dashboard, histórico e tela responsiva | Generic |

## Fora do escopo

- Otimização com restrição de equipe, dias de manejo, módulo ou praça (é do SeuGado).
- Envio por Telegram ou WhatsApp.
- Coleira física: no MVP a localização é simulada (estratégia do Quadro de Custos).
- Mais de uma fazenda por conta (o modelo tem `fazenda_id`, mas a interface trata uma só).
- Cadastro individual de animal, brinco, pesagem, vacinação.

## Relação com o SeuGado

Ver `02-integracao-seugado.md`. Resumo: o SeuGado decide e o Maneja observa e explica. Cada um funciona sozinho.
