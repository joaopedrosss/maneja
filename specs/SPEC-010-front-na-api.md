# SPEC-010 · Ligar o front à API

Responsável: João Pedro · Revisor: Kauê · Gantt: 3, 8 · Camada DDD: generic

## Contexto
O front roda com o mock (`src/lib/demo.ts` e `src/lib/fazenda.tsx`). Esta spec faz o front usar a API quando `VITE_API_URL` estiver definida e manter o modo demonstração quando não estiver (decisão D7). Os tipos são os mesmos: o JSON da API segue `src/lib/tipos.ts`.

## Arquivos
- CRIAR `src/lib/api.ts`
- ALTERAR `src/lib/fazenda.tsx` (carregar da API; ações chamam a API)
- ALTERAR `src/lib/tipos.ts` (campos novos da `Movimentacao`: `explicacao`, `explicacao_origem`, `coleiras`, `origem_plano`, `externo_id`; `Piquete.externo_id`)
- ALTERAR `src/paginas/Plano.tsx` (mostrar `explicacao` e um selo "IA" quando `explicacao_origem === "llm"`)

## Requisitos
- **R1.** Funções em `api.ts`: `carregarBase()`, `gerarPlano()`, `aceitar(id, destinoId?)`, `recusar(id)`, `criarPiquete(...)`, `salvarLotacao(...)`. Erro 422 mostra os motivos devolvidos pela API na tela.
- **R2.** `regras.ts` continua validando a escolha manual antes de chamar a API.
- **R3.** Sem `VITE_API_URL`, tudo funciona como hoje.

## Cenários (aceite manual, roteiro)
```gherkin
Funcionalidade: Front na API

  Cenário: Plano vindo da API
    Dado a API rodando e VITE_API_URL apontando para ela
    Quando eu clico em "Gerar plano"
    Então aparece a movimentação do Piquete Abóbora para o Piquete Macarrão

  Cenário: Erro de regra na tela
    Quando eu troco o destino para um piquete ocupado
    Então a tela mostra o motivo devolvido pela API

  Cenário: Modo demonstração
    Dado VITE_API_URL vazia
    Então o front funciona com os dados de demonstração
```

## Fora do escopo
Login (SPEC-009) e telas de coleiras (SPEC-011).
