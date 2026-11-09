# Maneja — Manejo Inteligente de Bois (protótipo)

Protótipo navegável do painel do técnico, baseado no frontend do SeuGado.
Cobre as telas **Mapa**, **Plano da semana**, **Rebanho** e **Fazenda**.

Não tem backend, banco, login nem IA. Tudo roda no navegador:

- os dados de demonstração estão em `src/lib/demo.ts`, com datas relativas a hoje;
- o "agente" é um conjunto de regras em `src/lib/agente.ts`: olha o NDVI mais recente de cada piquete, decide quando o lote precisa sair e escolhe o piquete.

Recarregar a página volta tudo ao estado inicial.

## Como rodar

Precisa do Node.js 20.19 ou mais novo (https://nodejs.org).

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

O mapa de satélite (Esri) precisa de internet.

## Roteiro da demonstração (fluxo do diagrama de atividades)

1. **Mapa** (Fazenda do Marcinho): os piquetes aparecem coloridos pelo estado estimado: com gado, pronto para entrar ou crescendo. A linha tracejada mostra a próxima movimentação recomendada. Para cadastrar um piquete novo, desenhe um polígono com a ferramenta no canto esquerdo.
2. **Plano da semana**: o agente recomenda mover o rebanho do Abóbora para o Macarrão, com confiança baixa porque o Macarrão foi medido há 20 dias.
   - **Aceita?** Se sim, clique em *Confirmar movimentação*. Se não, clique em *Escolher outro piquete* e escolha o Jerimum.
   - A movimentação é registrada e o mapa se atualiza.
3. **Gerar plano**: o plano é gerado e aparece na tela.
