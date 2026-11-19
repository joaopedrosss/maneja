# SPEC-012 · Ligar a integração com o SeuGado em modo api

Responsável: José Felix · Revisor: Kauê · Gantt: 9 · Camada: integração

## Contexto
Os modos `desligado` e `arquivo` já funcionam (SPEC-003). Esta spec implementa `SeuGadoApi.plano_atual()` contra a API real do SeuGado, conforme `docs/02-integracao-seugado.md`. **O Maneja nunca pode depender disso para funcionar.**

## Arquivos
- ALTERAR `backend/maneja/adaptadores/seugado.py`
- CRIAR `backend/features/seugado_api.feature`, `backend/tests/test_seugado_api.py`

## Requisitos
- **R1.** `POST {url}/auth/token` com e-mail e senha (form `username`/`password`, conferir no SeuGado) e `GET {url}/fazendas/{fazenda_id}/plano/atual` com `Authorization: Bearer`. Guarda o token até expirar.
- **R2.** O 404 do SeuGado ("Ainda não há plano") devolve `None`. Erro de rede ou 5xx lança exceção (o sistema transforma em aviso `plano_externo_indisponivel`).
- **R3.** Cache do plano por 10 minutos, para não consultar o SeuGado a cada tela.
- **R4.** Testes com `httpx.MockTransport`, sem rede.

## Cenários (BDD)
```gherkin
Funcionalidade: SeuGado em modo api

  Cenário: Plano lido da API
    Dado o SeuGado respondendo um plano com 1 movimentação
    Quando o sistema verifica as movimentações
    Então há uma verificação vinda do SeuGado

  Cenário: SeuGado sem plano
    Dado o SeuGado respondendo 404 no plano
    Quando o sistema verifica as movimentações
    Então nenhuma verificação vem do SeuGado

  Cenário: SeuGado fora do ar
    Dado o SeuGado fora do ar
    Quando o sistema verifica as movimentações
    Então há o aviso "plano_externo_indisponivel"
```

## Fora do escopo
Qualquer mudança no repositório do SeuGado (é decidida no processo de ADR de lá).
