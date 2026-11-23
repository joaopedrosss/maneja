"""Adaptador do SeuGado (docs/02-integracao-seugado.md).

Regra de independência: o Maneja nunca depende do SeuGado. O modo padrão é desligado,
e qualquer falha aqui vira um aviso, nunca um erro para o usuário.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Protocol


class ISeuGado(Protocol):
    modo: str

    def plano_atual(self) -> dict | None: ...


class SeuGadoDesligado:
    modo = "desligado"

    def plano_atual(self) -> dict | None:
        return None


class SeuGadoArquivo:
    """Lê o plano vigente de um JSON no formato de GET /fazendas/{id}/plano/atual do SeuGado."""

    modo = "arquivo"

    def __init__(self, caminho: str | Path) -> None:
        self.caminho = Path(caminho)

    def plano_atual(self) -> dict | None:
        return json.loads(self.caminho.read_text(encoding="utf-8"))


class SeuGadoApi:
    """Chamada real à API do SeuGado: SPEC-012."""

    modo = "api"

    def __init__(self, url: str, email: str, senha: str, fazenda_id: str) -> None:
        self.url, self.email, self.senha, self.fazenda_id = url, email, senha, fazenda_id

    def plano_atual(self) -> dict | None:
        raise NotImplementedError("integração em modo api: SPEC-012")
