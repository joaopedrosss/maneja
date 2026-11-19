"""Previsão do tempo. O Open-Meteo real entra na SPEC-006; aqui fica a versão simulada."""

from __future__ import annotations

from ..datas import somar_dias
from ..dominio import PrevisaoClima, PrevisaoDia

CHUVAS_DEMO = [0, 2, 48, 12, 0, 0, 5]
MINIMAS_DEMO = [22, 22, 21, 21, 22, 23, 23]
MAXIMAS_DEMO = [31, 30, 26, 27, 30, 32, 31]


class ClimaSimulado:
    """Mesma semana de src/lib/demo.ts: chuva forte no 3º dia."""

    def __init__(self, chuvas: list[float] | None = None) -> None:
        self.chuvas = chuvas or CHUVAS_DEMO

    def previsao(self, fazenda_id: str, lat: float, lon: float, hoje: str) -> PrevisaoClima:
        return PrevisaoClima(fazenda_id, [
            PrevisaoDia(somar_dias(hoje, i), float(c), float(MINIMAS_DEMO[i]), float(MAXIMAS_DEMO[i]))
            for i, c in enumerate(self.chuvas[:7])
        ])
