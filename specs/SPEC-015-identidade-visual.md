# SPEC-015 · Dar ao Maneja uma identidade visual própria

Responsável: Kauê · Revisor: João Pedro · Gantt: 3, 8 · Camada DDD: generic

## Contexto
O front nasceu de um protótipo do SeuGado e ainda se parece com ele: menu lateral escuro, verde `#008734`, fonte Poppins, cartões com sombra e cantos de 16 px. São sistemas diferentes (decisão D13), e o Maneja precisa ser reconhecível à primeira vista. A mudança é só de aparência: nenhuma regra, dado ou fluxo muda.

## Arquivos
- ALTERAR `src/estilo/tema.css` (tokens), `src/componentes/Layout.tsx` e `Layout.css` (navegação), `src/componentes/ui/Icones.tsx` (marca), `index.html` (fonte e título), `public/favicon.svg`
- ALTERAR o CSS das páginas só onde houver cor ou medida fixa fora dos tokens

## Requisitos
- **R1. Navegação.** Sai o menu lateral escuro. Entra uma **barra superior clara**: marca à esquerda, abas das telas no centro, e usuário e "Sair" à direita. No celular (360 px), as abas viram uma barra inferior com ícones, sem rolagem horizontal (critério de qualidade 4.3).
- **R2. Paleta "campo"**, sem o verde do SeuGado como cor principal:
  - primária `#1F5A73` (azul-petróleo, água e céu);
  - destaque `#C8742B` (barro e terra), usado em ações e alertas suaves;
  - fundo `#F5F2EA` (palha);
  - superfície `#FFFFFF`;
  - texto `#1E2A2F`.

  A escala de NDVI do mapa não muda (vermelho → amarelo → azul), porque é informação, não marca.
- **R3. Tipografia.** "Manrope", pelo Google Fonts, no lugar de Poppins. Títulos com peso 700 e corpo com 500.
- **R4. Forma.** Cantos de 10 px (eram 16 px), cartões com borda de 1 px em vez de sombra, botões com altura de 40 px.
- **R5. Marca.** Ícone novo: um piquete (polígono) com um marcador de GPS. A palavra "Maneja" sem o sufixo "· Admin". Favicon novo.
- **R6. Sem regressão.** Todas as telas (Mapa, Plano, Rebanho, Histórico, Dashboard, Fazenda e Login) continuam funcionando nos dois modos (API e demonstração). O build e o `tsc` passam.

## Aceite (manual)
- Colocar lado a lado o print de uma tela do SeuGado e a mesma tela do Maneja: não devem parecer o mesmo produto.
- Abrir em 360 px: a navegação fica embaixo e não há rolagem horizontal.

## Fora do escopo
Modo escuro. Mudar textos, fluxos ou a escala de NDVI.

## Como ficou
- **Tokens e tipografia (`src/estilo/tema.css`, `index.html`):** paleta "campo" (azul-petróleo `#1F5A73`, barro `#C8742B`, palha `#F5F2EA`, superfície `#FFFFFF`, texto `#1E2A2F`), fonte Manrope pelo Google Fonts, cantos de 10 px, cartões com borda de 1 px em vez de sombra e botões com altura mínima de 40 px. A escala de NDVI foi preservada.
- **Navegação (`src/componentes/Layout.tsx`, `Layout.css`):** barra superior branca de 60 px com marca à esquerda ("Maneja", sem "· Admin"), abas no centro (ativo em azul-petróleo com indicador barro de 3 px) e avatar, usuário, fazenda e "Sair" à direita. Até 640 px, as abas viram barra inferior fixa de 64 px com ícones e rótulos curtos, e `--altura-topo` compensa ambas as barras para o mapa.
- **Marca e favicon (`src/componentes/ui/Icones.tsx`, `public/favicon.svg`):** polígono de piquete em azul-petróleo com marcador de GPS em barro.
- **Páginas (`src/paginas/*.css`, `src/componentes/ui/GraficoNdvi.*`):** cores fixas removidas, botões e cartões alinhados aos tokens, e ajustes responsivos para 360 px (incluindo o gráfico SVG do Dashboard sem rolagem horizontal).

## Situação
Feita em 19/11 (Kauê). Testada no navegador em todas as 7 telas (Mapa, Plano, Rebanho, Histórico, Dashboard, Fazenda e Login), nos modos API e demonstração, em desktop (1280×800) e celular (360×740), sem rolagem horizontal. `npx tsc -b`, `npm run build` e `uv run pytest` (39 cenários) passando.
