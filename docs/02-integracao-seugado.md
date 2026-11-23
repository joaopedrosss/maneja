# Integração Maneja ↔ SeuGado (PiqueTech)

## Princípio

São **dois sistemas independentes**. Cada um funciona e tem utilidade sozinho, e nenhum depende do outro para subir, testar ou demonstrar. Quando os dois estão ligados, eles se complementam:

| | SeuGado / PiqueTech | Maneja |
|---|---|---|
| Papel | **Cérebro**: decide quando mover, para onde e por quantos dias | **Olhos e painel**: observa o que acontece no campo e explica |
| Pergunta | "Para onde vai o lote?" | "O gado foi mesmo? Como o pasto respondeu? Por quê?" |
| Dados próprios | Massa de forragem (SAFER), clima, motor de otimização | Coleiras GPS, ocupação observada, NDVI por piquete, rebanho por categoria |
| Usuário | Pecuarista, pelo Telegram | Técnico ou gestor, pelo painel web |
| Fora do escopo dele, coberto pelo outro | Coleira GPS e hardware (escopo do SeuGado, "fora do MVP") | Otimização com restrições de equipe, módulo e praça |

## O que cada um faz sozinho

- **Maneja sozinho:** cadastra piquetes e rebanho, lê NDVI, simula as coleiras e estima a ocupação. O agente recomenda movimentações com regra própria e o Gemini explica. Também compara o que foi aceito com o que as coleiras mostram (planejado × realizado).
- **SeuGado sozinho:** continua igual. Faz o plano, a ordem do dia no Telegram e a confirmação por toque ("Fiz", "Não fiz", "Fiz diferente").

## O que acontece quando estão ligados

```
SeuGado ──(1) plano vigente──▶ Maneja
                                 │ compara o plano com as coleiras
SeuGado ◀──(2) execuções observadas── Maneja
```

1. **SeuGado → Maneja:** o Maneja lê o plano vigente do SeuGado e passa a usá-lo como "planejado", no lugar da recomendação própria. O agente do Maneja continua explicando e alertando, mas não decide por cima do SeuGado.
2. **Maneja → SeuGado:** o Maneja publica, para cada movimentação do plano, o que as coleiras viram: cumprida, pendente ou divergente. O SeuGado pode usar isso como confirmação automática, sem depender do toque do pecuarista.

Nenhuma das duas setas é obrigatória. Sem a (1), o Maneja usa as próprias recomendações. Sem a (2), o SeuGado segue com a confirmação pelo Telegram.

## Lado Maneja

### Modos do adaptador (`MANEJA_SEUGADO_MODO`)

| Modo | O que faz | Para quê |
|---|---|---|
| `desligado` (padrão) | Não lê nada. O planejado vem do próprio agente | Uso independente |
| `arquivo` | Lê o plano de um JSON local (`MANEJA_SEUGADO_ARQUIVO`) no formato da resposta do SeuGado | Demonstração e testes, sem depender da outra equipe |
| `api` | Chama a API do SeuGado (`MANEJA_SEUGADO_URL`, `MANEJA_SEUGADO_EMAIL`, `MANEJA_SEUGADO_SENHA`, `MANEJA_SEUGADO_FAZENDA_ID`) | Integração real |

Se a API do SeuGado falhar, o Maneja registra o erro, mostra "plano externo indisponível" e volta ao modo próprio. Nunca trava.

### O que o Maneja lê do SeuGado (endpoints que já existem lá)

| Endpoint do SeuGado | Uso no Maneja |
|---|---|
| `POST /auth/token` | Obter o token de serviço |
| `GET /fazendas/{id}/plano/atual` | Movimentações planejadas: `id`, `data`, `lote_id`, `lote_nome`, `piquete_origem_id`, `piquete_destino_id`, nomes, `motivo` |
| `GET /fazendas/{id}/piquetes` | Vincular piquetes pelo id externo |

Campos do plano usados pelo Maneja, no subconjunto de `PlanoManejo` do SeuGado:

```json
{
  "id": "uuid",
  "data_inicio": "2026-11-19",
  "movimentacoes": [
    {
      "id": "uuid",
      "data": "2026-11-19",
      "lote_id": "uuid",
      "lote_nome": "Lote Recria",
      "piquete_origem_id": "uuid ou null",
      "piquete_origem_nome": "Piquete Abóbora",
      "piquete_destino_id": "uuid",
      "piquete_destino_nome": "Piquete Macarrão",
      "motivo": "texto"
    }
  ]
}
```

O Maneja ignora os campos que não conhece. Assim, mudanças no SeuGado que só **acrescentam** campos não quebram a integração.

### Vínculo de identificadores

Cada piquete do Maneja tem um campo opcional `externo_id`, com o id do piquete no SeuGado. Uma movimentação do plano externo só é verificada quando origem e destino têm vínculo. Sem vínculo, ela aparece como "sem vínculo" e não gera alerta.

### O que o Maneja expõe para o SeuGado

`GET /integracao/v1/execucoes?desde=AAAA-MM-DD` (autenticado), que responde:

```json
[
  {
    "movimentacao_externa_id": "uuid do SeuGado",
    "piquete_origem_externo_id": "uuid",
    "piquete_destino_externo_id": "uuid",
    "status": "cumprida | pendente | divergente | sem_dados",
    "fracao_no_destino": 0.83,
    "coleiras_consideradas": 6,
    "observado_em": "2026-11-19T14:05:00-03:00"
  }
]
```

| Status | Regra |
|---|---|
| `cumprida` | Pelo menos 75% das posições recentes das coleiras do grupo estão dentro do destino (critério de qualidade 2.1.2) |
| `pendente` | O grupo continua majoritariamente na origem e o prazo ainda não venceu (data da movimentação + 1 dia) |
| `divergente` | O prazo venceu e o grupo não está no destino. Pode ter ido para outro piquete ou ficado na origem |
| `sem_dados` | Menos de 3 coleiras com posição recente |

## Lado SeuGado (proposta, a decidir no processo de ADR do SeuGado)

Nada muda no SeuGado para a seta (1). Os endpoints já existem.

Para a seta (2), a proposta é uma ADR do tipo "aceitar confirmação de execução vinda de fonte externa":
- Um job ou endpoint consulta `GET /integracao/v1/execucoes` do Maneja.
- O resultado entra no registro de execuções, com `origem = "maneja"`.
- `cumprida` equivale a "Fiz", `divergente` equivale a "Fiz diferente" e `pendente` não faz nada.

Isso não fere o escopo do SeuGado: o hardware continua fora dele, porque quem tem a coleira é o Maneja.
