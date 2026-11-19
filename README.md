# Maneja · Manejo Inteligente de Bois

Painel web do manejo rotacionado. Para cada piquete, o Maneja junta:
- o NDVI (vigor do pasto);
- o rebanho por categoria (bois, vacas e bezerros);
- a posição real do gado, pelas coleiras GPS (simuladas no MVP).

Um agente recomenda as movimentações. **As regras decidem e o Gemini só explica.** O sistema confere pelas coleiras se a movimentação aconteceu de fato (planejado × realizado).

O Maneja funciona sozinho. Opcionalmente, ele se integra ao SeuGado/PiqueTech: lê o plano dele e devolve o que as coleiras viram (`docs/02-integracao-seugado.md`).

Telas: **Mapa**, **Plano**, **Rebanho**, **Histórico**, **Dashboard** e **Fazenda**.

## Documentação (SDD)

| Onde | O quê |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Regras do projeto para o Claude Code e para a equipe |
| [`docs/`](docs/) | Visão, decisões, integração com o SeuGado e o plano da AB2 |
| [`docs/uml/`](docs/uml/) | Os 8 diagramas UML em Mermaid |
| [`specs/`](specs/) | Uma spec por fatia, com cenários BDD |
| [`backend/features/`](backend/features/) | Os cenários BDD executáveis (`pytest-bdd`) |

## Backend

Precisa do [uv](https://docs.astral.sh/uv/).

```bash
cd backend
uv sync
uv run pytest                                  # cenários BDD
uv run uvicorn maneja.api:app --reload         # API em http://localhost:8000 (documentação em /docs)
MANEJA_SEUGADO_MODO=arquivo uv run uvicorn maneja.api:app --reload   # com o plano de exemplo do SeuGado
```

## Front-end

O front ainda roda com dados mockados no navegador. A SPEC-010 liga a API.

### Como rodar o front

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
