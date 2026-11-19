# Alinhamento do Maneja ao planejamento

Este documento explica o que mudou na branch `refactor/alinhar-maneja-ao-planejamento` e por quê.

## Motivo geral

O repositório era um protótipo herdado do SeuGado. Ele decidia o manejo pela altura do capim medida em campo, enviava o plano pelo Telegram, considerava a capacidade da equipe e organizava o gado em lotes. Nada disso está no planejamento do projeto.

O planejamento descreve outro fluxo: o NDVI semanal de cada piquete, a previsão do tempo e o rebanho cadastrado entram em um agente. Regras determinísticas validam a recomendação, e o produtor aceita ou recusa.

O escopo desta etapa é só front-end com dados mockados. Não há backend, banco, login nem chamadas ao Earth Engine, Open-Meteo ou Gemini. A interface e o modelo de dados ficam prontos para depois trocar o mock pela API.

## O que mudou e por quê

| Item | Mudança | Por quê |
|---|---|---|
| 1. Telegram | Saíram o vínculo com o bot, o link, o agendamento e o envio. "Gerar plano" só gera e mostra na tela. | O canal de envio não faz parte do planejamento. |
| 2. Equipe e dias de manejo | Saíram os campos da fazenda, os dois alertas e a interface correspondente. | A recomendação não depende mais da capacidade da equipe nem de dias permitidos. |
| 3. NDVI | Altura, cultivares, simulação dia a dia e medições em campo deram lugar a leituras semanais de NDVI. O mapa usa gradiente vermelho→azul, e piquete sem leitura fica cinza. | O NDVI por satélite é o dado central do planejamento e dispensa a medição manual. |
| 4. Clima | Nova previsão de 7 dias, resumida na tela Plano e usada pelo agente. | A decisão precisa considerar o tempo da semana. Em dia de chuva forte, a movimentação é adiada e gera alerta. |
| 5. Rebanho | `Lote` deu lugar à lotação por piquete, com bois, vacas e bezerros. Há uma nova tela Rebanho. | O planejamento cadastra o rebanho por categoria, e cada categoria pesa de forma diferente na área. |
| 6. Agente e regras | Uma função única, `gerarRecomendacao`, e as validações em `regras.ts`. | Separa quem sugere de quem valida. Quando o Gemini entrar, a resposta dele continua passando pelas mesmas regras. |
| 7. Aceite e recusa | Confirmar, trocar destino e recusar ficam registrados no histórico. A escolha manual passa pelas mesmas regras. | O produtor tem a decisão final, e o sistema precisa guardar o que foi decidido. |
| 8. Uma fazenda | Saíram o seletor e `cliente_nome`. `fazenda_id` continua nos tipos. | O escopo atual é uma fazenda, mas o modelo não impede várias no futuro. |
| 9. Histórico e Dashboard | Telas novas, com status das recomendações, NDVI médio, gráfico semanal, alertas ativos e lotação. O gráfico é um SVG próprio. | Pedidas no planejamento. O SVG próprio evita uma dependência nova. |
| 10. Mock e documentação | `demo.ts` reescrito com uma fazenda, 5 piquetes, 8 semanas de NDVI, clima, rebanho e histórico. README refeito com o novo roteiro. | Os dados mostram os casos da demonstração: piquete degradando, piquete recuperando, destino descartado pelas regras e chuva forte. |

## Como a recomendação funciona

1. O agente seleciona os piquetes ocupados com NDVI abaixo de 0,35, começando pelo pior.
2. Para cada um, tenta os piquetes livres do NDVI mais alto para o mais baixo. Uma rota recusada nos últimos 7 dias não é sugerida de novo.
3. Cada candidato passa por `validarMovimento`: o destino existe, está livre, tem NDVI mínimo e o rebanho cabe na área.
4. O primeiro candidato aprovado vira a recomendação, e os descartados são explicados no motivo. Sem nenhum aprovado, sai o alerta `sem_piquete_apto`.
5. A confiança depende da idade da leitura de NDVI do destino: até 7 dias é alta, até 14 é média e acima disso é baixa.

## Decisões tomadas durante o trabalho

- **Botão "Recusar".** O item 7 citava só "Confirmar movimentação" e "Escolher outro piquete", mas o planejamento diz que o produtor recusa e o Histórico precisa do status "recusada".
- **Item 10.** A especificação chegou cortada em "rebanho por categoria". O restante foi interpretado como histórico mockado e README.
- **Meio da escala do mapa em amarelo.** Um meio cinza se confundiria com o cinza de "sem leitura".
- **Imagens da Esri mantidas no mapa.** São camadas de imagem já existentes, sem `fetch` ou `axios`.

## Limites a validar

Estes valores foram escolhidos para a demonstração e precisam ser validados por quem conhece o manejo.

| Regra | Valor | Arquivo |
|---|---|---|
| Gado precisa sair | NDVI abaixo de 0,35 | `src/lib/agente.ts` |
| Falta capim | NDVI abaixo de 0,30 | `src/lib/agente.ts` |
| Passando do ponto | NDVI 0,80 ou mais | `src/lib/agente.ts` |
| Semana seca | menos de 5 mm no total | `src/lib/agente.ts` |
| Mínimo para receber gado | NDVI 0,50 | `src/lib/regras.ts` |
| Capacidade do piquete | 6 UA/ha | `src/lib/regras.ts` |
| Peso por categoria | boi e vaca 1 UA, bezerro 0,4 UA | `src/lib/regras.ts` |
| Chuva forte | 40 mm ou mais no dia | `src/lib/clima.ts` |

## Pendências conhecidas

- Sair do Mapa logo ao abrir, antes de ele terminar de enquadrar os piquetes, gera um erro do Leaflet no console. O mesmo erro existe no commit original.
- O lint mantém um aviso de fast refresh em `src/lib/fazenda.tsx`, também anterior a estas mudanças.
- Piquetes desenhados na demonstração ficam sem leitura de NDVI até existir a integração real.

## Próximo passo: ligar a API

- Trocar `baseInicial` em `src/lib/fazenda.tsx` pelas consultas reais.
- Trocar o corpo de `gerarRecomendacao` pela chamada ao backend. Há um comentário marcando o ponto em `src/lib/agente.ts`.
- Manter `validarMovimento` entre a resposta da API e a tela.
