# Decisões

Uma linha por decisão. Para mudar uma, acrescente outra que a substitua; não apague.

| # | Data | Decisão | Por quê |
|---|---|---|---|
| D1 | 09/11 | O front segue o planejamento de GP: NDVI, clima, rebanho por categoria, histórico e dashboard. Saem Telegram, equipe e dias de manejo | O protótipo herdado do SeuGado não batia com a EAP (branch `refactor/alinhar-maneja-ao-planejamento`) |
| D2 | 19/11 | Backend em Python 3.12 + FastAPI | É o que o Diagrama de Implantação e o snippet do módulo 5 descrevem |
| D3 | 19/11 | O Maneja e o SeuGado são independentes e se complementam por API. O SeuGado decide, e o Maneja observa (coleiras) e explica | Evita dois sistemas iguais e cobre o que o SeuGado deixou fora do escopo (hardware) |
| D4 | 19/11 | As regras decidem e o LLM só escreve o texto. Texto que contradiz a regra é descartado | Risco R3 do registro de riscos |
| D5 | 19/11 | Coleiras GPS simuladas no MVP, atrás do adaptador `IColeiras` | Estratégia do MVP no Quadro de Custos (sem compra) |
| D6 | 19/11 | Armazenamento em memória até a SPEC-008 (PostgreSQL) | Permite ter API e testes hoje; o repositório já é uma interface |
| D7 | 19/11 | O front continua funcionando sem backend (modo demonstração) até a SPEC-010 ligar a API | A apresentação não pode depender do deploy |
| D8 | 19/11 | BDD com `pytest-bdd`: cada spec traz cenários que viram `.feature` | Exigência da AB2 (SDD + BDD) |
| D9 | 19/11 | PostgreSQL por "estado em memória + gravação transacional do todo" (substitui a D6) | Mantém a interface do repositório e cabe no prazo; o volume da demonstração é pequeno |
| D10 | 19/11 | O `main` do fork `kaeffea/maneja` é o branch de integração; o PR #1 leva tudo ao repositório do João | O Kauê não tem permissão de escrita no repositório original |
| D11 | 19/11 | Deploy na Vercel (front e API, região gru1) com PostgreSQL no Supabase, no lugar do Render | Mesma infraestrutura que o Kauê já opera no SeuGado; continua gratuita |
| D12 | 19/11 | Tudo que envolve o SeuGado (SPEC-012 e a ADR do lado de lá) é com o Kauê | Ele é o dono do SeuGado |
| D13 | 19/11 | O visual do Maneja tem identidade própria, diferente do SeuGado (SPEC-015) | São sistemas diferentes e precisam parecer diferentes |
