"""Leituras de NDVI: última leitura, confiança pela idade e resumo dos piquetes."""

from .datas import dias_entre, ha_quanto
from .dominio import Confianca, LeituraNdvi, Lotacao, Piquete, ResumoPiquete

LEITURA_RECENTE_DIAS = 7
LEITURA_VELHA_DIAS = 14


def ultima_leitura(ndvi: list[LeituraNdvi], piquete_id: str, ate: str) -> LeituraNdvi | None:
    melhor = None
    for leitura in ndvi:
        if leitura.piquete_id != piquete_id or leitura.data > ate:
            continue
        if melhor is None or leitura.data >= melhor.data:
            melhor = leitura
    return melhor


def confianca_da_leitura(leitura: LeituraNdvi | None, hoje: str) -> Confianca:
    if leitura is None:
        return "baixa"
    dias = dias_entre(leitura.data, hoje)
    if dias <= LEITURA_RECENTE_DIAS:
        return "alta"
    if dias <= LEITURA_VELHA_DIAS:
        return "media"
    return "baixa"


def motivo_confianca(leitura: LeituraNdvi | None, hoje: str) -> str:
    if leitura is None:
        return "sem leitura de NDVI"
    return f"última leitura de NDVI {ha_quanto(dias_entre(leitura.data, hoje))}"


def lotacao_de(lotacao: list[Lotacao], piquete_id: str) -> Lotacao | None:
    """Piquete sem linha de lotação, ou com total 0, está livre."""
    return next((l for l in lotacao if l.piquete_id == piquete_id and l.rebanho.total > 0), None)


def resumo_piquetes(piquetes: list[Piquete], ndvi: list[LeituraNdvi], lotacao: list[Lotacao], hoje: str) -> list[ResumoPiquete]:
    resumo = []
    for p in piquetes:
        lot = lotacao_de(lotacao, p.id)
        leitura = ultima_leitura(ndvi, p.id, hoje)
        resumo.append(ResumoPiquete(
            piquete_id=p.id,
            nome=p.nome,
            vegetacao=p.vegetacao,
            area_ha=p.area_ha,
            situacao="ocupado" if lot else "descansando",
            rebanho=lot.rebanho if lot else None,
            ndvi=leitura.valor if leitura else None,
            data_ndvi=leitura.data if leitura else None,
            confianca=confianca_da_leitura(leitura, hoje),
            motivo_confianca=motivo_confianca(leitura, hoje),
        ))
    return resumo
