"""Datas como texto ISO (AAAA-MM-DD), como no front."""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo


def somar_dias(data: str, dias: int) -> str:
    return (date.fromisoformat(data) + timedelta(days=dias)).isoformat()


def dias_entre(inicio: str, fim: str) -> int:
    return (date.fromisoformat(fim) - date.fromisoformat(inicio)).days


def hoje_na_fazenda(agora: datetime, fuso: str) -> str:
    return agora.astimezone(ZoneInfo(fuso)).date().isoformat()


def data_com_dia(data: str) -> str:
    dias = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
    d = date.fromisoformat(data)
    return f"{dias[d.weekday()]}, {d.day:02d}/{d.month:02d}"


def decimal(valor: float, casas: int) -> str:
    return f"{valor:.{casas}f}".replace(".", ",")


def ha_quanto(dias: int) -> str:
    if dias == 0:
        return "hoje"
    if dias == 1:
        return "há 1 dia"
    return f"há {dias} dias"
