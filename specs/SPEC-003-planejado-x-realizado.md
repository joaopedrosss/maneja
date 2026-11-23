# SPEC-003 · Comparar o planejado com o realizado

Responsável: Kauê (base) → José Felix (evolução) · Revisor: José Felix · Gantt: 7, 9 · Camada DDD: core

## Contexto
Uma movimentação aceita no sistema não garante que o gado foi levado. Esta spec compara cada movimentação planejada com o que as coleiras mostram. O planejado vem de duas fontes:
- as movimentações aceitas ou trocadas no próprio Maneja;
- quando a integração está ligada, o plano vigente do SeuGado (`docs/02-integracao-seugado.md`).

## Arquivos
- CRIAR `backend/maneja/verificacao.py`, `backend/maneja/adaptadores/seugado.py`
- CRIAR `backend/exemplos/plano-seugado.json` (plano de exemplo no formato do SeuGado)
- CRIAR `backend/features/verificacao.feature`, `backend/tests/test_verificacao.py`

## Requisitos
- **R1.** `verificar(mov, piquetes, coleiras, posicoes, agora, hoje) -> Verificacao`. Usa as coleiras de `mov.coleiras`, considerando a última posição na janela de 6 h de cada uma.
  - `sem_vinculo`: origem ou destino sem piquete correspondente no Maneja (só no plano externo).
  - `sem_dados`: menos de 3 coleiras com posição recente.
  - `cumprida`: fração no destino ≥ 0,75.
  - `pendente`: não cumprida e `hoje <= data + 1 dia`.
  - `divergente`: não cumprida e o prazo venceu.
- **R2. Coleiras do grupo.** Ao aceitar uma movimentação no Maneja, guarda em `mov.coleiras` as coleiras observadas na origem naquele momento. Se nenhuma tiver sinal, usa as do cadastro. Para o plano externo, usa as coleiras do cadastro da origem mais as observadas na origem.
- **R3. Adaptador do SeuGado.** `ISeuGado.plano_atual() -> dict | None`, com três implementações:
  - `SeuGadoDesligado`: devolve sempre `None`;
  - `SeuGadoArquivo(caminho)`: lê o JSON;
  - `SeuGadoApi`: definida na SPEC-012; aqui só lança `NotImplementedError`.

  Erro do adaptador nunca derruba a verificação: o resultado vem só com o planejado próprio, mais o aviso `plano_externo_indisponivel`.
- **R4. Conversão.** `movimentacoes_externas(plano, piquetes, ...)` converte as movimentações do SeuGado em `Movimentacao` com `origem_plano = "seugado"` e `externo_id`, mapeando os piquetes pelo `externo_id`.

## Constantes
`FRACAO_CUMPRIDA = 0.75` (critério de qualidade 2.1.2), `MIN_COLEIRAS = 3`, `PRAZO_DIAS = 1`.

## Cenários (BDD)

```gherkin
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
```

## Fora do escopo
Mudar o cadastro automaticamente quando a movimentação for cumprida. Chamar a API do SeuGado (SPEC-012).
