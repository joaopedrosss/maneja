"""Modelos de linguagem. O Gemini real entra na SPEC-005; aqui ficam as versões sem rede."""

from __future__ import annotations

from ..dominio import CotaEsgotada


class LLMFixo:
    """Responde sempre o mesmo texto. Usado nos testes do validador (risco R3)."""

    def __init__(self, resposta: str) -> None:
        self.resposta = resposta

    def gerar_texto(self, prompt: str) -> str:
        return self.resposta


class ControleDeCota:
    """Risco R7: conta as chamadas e lança CotaEsgotada ao passar do limite."""

    def __init__(self, llm, limite: int) -> None:
        self._llm, self.limite, self.usado = llm, limite, 0

    def gerar_texto(self, prompt: str) -> str:
        if self.usado >= self.limite:
            raise CotaEsgotada(f"cota de {self.limite} chamadas esgotada")
        self.usado += 1
        return self._llm.gerar_texto(prompt)
