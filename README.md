# Maneja — Manejo Inteligente de Bois (protótipo)

Ajuda o pecuarista a decidir para qual piquete mover o gado. O NDVI de cada piquete, a previsão do tempo da semana e o rebanho cadastrado entram em um agente que devolve alertas e recomendações. Regras determinísticas validam cada recomendação antes de ela aparecer, e o produtor aceita, troca o destino ou recusa.

Telas: **Mapa**, **Plano**, **Rebanho**, **Histórico**, **Dashboard** e **Fazenda**.

Este repositório é só o front-end. Não tem backend, banco, login nem chamadas ao Earth Engine, Open-Meteo ou Gemini. Tudo roda no navegador e recarregar a página volta ao estado inicial.

## Como rodar

Precisa do Node.js 20.19 ou mais novo (https://nodejs.org).

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

O mapa de satélite (Esri) precisa de internet.

## Onde fica cada coisa

| Arquivo | Papel |
|---|---|
| `src/lib/demo.ts` | Todos os dados mockados: NDVI, clima, rebanho e histórico, com datas relativas a hoje |
| `src/lib/tipos.ts` | Modelo de dados |
| `src/lib/agente.ts` | `gerarRecomendacao({ piquetes, ndvi, clima, lotacao, historico })`, regras locais no lugar do Gemini |
| `src/lib/regras.ts` | Validações: destino existe, está livre, tem NDVI mínimo e o rebanho cabe na área |
| `src/lib/fazenda.tsx` | Estado da aplicação, no lugar da API |

Para ligar a API depois: troque `baseInicial` em `fazenda.tsx` pelas consultas e o corpo de `gerarRecomendacao` pela chamada ao backend (há um comentário marcando o ponto). Mantenha `validarMovimento` entre a resposta e a tela.

## Roteiro da demonstração

1. **Mapa**: os piquetes aparecem em gradiente vermelho→azul pelo NDVI mais recente. A linha tracejada mostra a movimentação recomendada. Desenhe um polígono com a ferramenta no canto esquerdo: o piquete novo fica cinza porque ainda não tem leitura.
2. **Plano**: a previsão da semana mostra um dia de chuva forte, que também vira alerta. O agente recomenda mover o rebanho do Abóbora (NDVI 0,29) para o Macarrão, com confiança média porque a última leitura tem 9 dias. O Jerimum tem NDVI maior, mas as regras o descartam: o rebanho não cabe na área.
   - *Confirmar movimentação*: o rebanho muda de piquete e o mapa se atualiza.
   - *Escolher outro piquete*: a lista só traz destinos válidos, como o Feijão, e o registro fica como trocado.
   - *Recusar*: depois use *Gerar plano* e o agente sugere outro destino, porque a rota recusada não volta por 7 dias.
3. **Rebanho**: reduza o Abóbora para 10 bois, sem vacas nem bezerros, salve e gere o plano de novo. Agora o rebanho cabe no Jerimum e ele passa a ser o destino.
4. **Histórico**: as respostas anteriores e as novas aparecem com status aceita, trocada ou recusada.
5. **Dashboard**: NDVI médio da fazenda, alertas ativos, evolução semanal por piquete e lotação.
