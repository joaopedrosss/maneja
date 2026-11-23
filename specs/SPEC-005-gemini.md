# SPEC-005 · Ligar o Gemini real para escrever a explicação

Responsável: Leandro · Revisor: Kauê · Gantt: 7 · Camada DDD: core

## Contexto
O agente (SPEC-001) já decide por regras e aceita um `llm` com `gerar_texto(prompt) -> str`. Esta spec cria o adaptador real do Google Gemini. A regra continua decidindo. O texto do Gemini só é usado se passar no validador do risco R3 (`explicacao_valida` em `agente.py`), e a cota é controlada (risco R7).

## Arquivos
- ALTERAR `backend/maneja/adaptadores/llm.py` (criar `GeminiLLM`)
- ALTERAR `backend/maneja/config.py` (`MANEJA_GEMINI_API_KEY`, `MANEJA_GEMINI_MODELO`, `MANEJA_GEMINI_COTA_DIARIA`)
- CRIAR `backend/features/gemini.feature`, `backend/tests/test_gemini.py`

## Requisitos
- **R1.** `GeminiLLM(chave, modelo, cliente_http)`: faz `POST https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key=...` com `{"contents":[{"parts":[{"text": prompt}]}]}` e devolve `candidates[0].content.parts[0].text`. Timeout de 15 s.
- **R2.** Erro HTTP, timeout ou resposta sem texto: lança `CotaEsgotada` (status 429) ou `RuntimeError`. O agente já trata qualquer exceção do LLM usando o texto da regra (`agente.explicar`).
- **R3.** Sem `MANEJA_GEMINI_API_KEY`, o sistema sobe com `llm=None` (texto da regra). Com a chave, usa `ControleDeCota(GeminiLLM(...), limite=MANEJA_GEMINI_COTA_DIARIA)`.
- **R4.** Os testes nunca chamam a rede: o `cliente_http` é injetado (use `httpx.MockTransport`).

## Constantes
Modelo padrão `gemini-2.0-flash` (conferir o nome disponível na conta), cota diária padrão 50.

## Cenários (BDD)
```gherkin
Funcionalidade: Gemini

  Cenário: Resposta válida vira a explicação
    Dado um Gemini que responde "Leve o gado do Piquete Abóbora para o Piquete Macarrão, que tem pasto melhor."
    Quando o agente gera o plano
    Então a explicação da movimentação vem do LLM

  Cenário: Gemini fora do ar não derruba o plano
    Dado um Gemini que responde com erro 500
    Quando o agente gera o plano
    Então a explicação da movimentação vem da regra

  Cenário: Cota esgotada
    Dado um Gemini com cota de 0 chamadas
    Quando o agente gera o plano
    Então a explicação da movimentação vem da regra
```

## Fora do escopo
O Gemini decidir destino. Chat livre com o usuário.
