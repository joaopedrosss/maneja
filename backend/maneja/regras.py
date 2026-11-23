"""Regras determinísticas de validação (as mesmas de src/lib/regras.ts).

Toda movimentação, sugerida pelo agente ou escolhida à mão, passa por validar_movimento.
Cada regra devolve o motivo da reprovação, ou None quando aprova.
"""

from .datas import decimal
from .dominio import LeituraNdvi, Lotacao, Piquete, Rebanho
from .ndvi import lotacao_de, ultima_leitura

NDVI_MINIMO_DESTINO = 0.5  # a validar
UA_MAX_POR_HA = 6  # a validar
UA_POR_CATEGORIA = {"bois": 1.0, "vacas": 1.0, "bezerros": 0.4}  # a validar (critério de qualidade 1.1.2)


def ua_do_rebanho(r: Rebanho) -> float:
    return r.bois * UA_POR_CATEGORIA["bois"] + r.vacas * UA_POR_CATEGORIA["vacas"] + r.bezerros * UA_POR_CATEGORIA["bezerros"]


def destino_existe(piquetes: list[Piquete], destino_id: str) -> str | None:
    return None if any(p.id == destino_id for p in piquetes) else "o piquete de destino não existe mais"


def destino_livre(lotacao: list[Lotacao], destino: Piquete) -> str | None:
    return f"{destino.nome} já está ocupado" if lotacao_de(lotacao, destino.id) else None


def ndvi_acima_do_minimo(ndvi: list[LeituraNdvi], destino: Piquete, hoje: str) -> str | None:
    leitura = ultima_leitura(ndvi, destino.id, hoje)
    if leitura is None:
        return f"{destino.nome} não tem leitura de NDVI"
    if leitura.valor < NDVI_MINIMO_DESTINO:
        return (f"{destino.nome} tem NDVI {decimal(leitura.valor, 2)}, "
                f"abaixo do mínimo de {decimal(NDVI_MINIMO_DESTINO, 2)}")
    return None


def rebanho_cabe_na_area(rebanho: Rebanho, destino: Piquete) -> str | None:
    ua = ua_do_rebanho(rebanho)
    maximo = destino.area_ha * UA_MAX_POR_HA
    if ua <= maximo:
        return None
    return (f"o rebanho ({decimal(ua, 1)} UA) não cabe em {destino.nome} "
            f"(máximo de {decimal(maximo, 1)} UA em {decimal(destino.area_ha, 2)} ha)")


def validar_movimento(
    destino_id: str,
    rebanho: Rebanho,
    piquetes: list[Piquete],
    ndvi: list[LeituraNdvi],
    lotacao: list[Lotacao],
    hoje: str,
) -> list[str]:
    """Lista vazia = movimentação aprovada."""
    inexistente = destino_existe(piquetes, destino_id)
    if inexistente is not None:
        return [inexistente]
    destino = next(p for p in piquetes if p.id == destino_id)
    motivos = [
        destino_livre(lotacao, destino),
        ndvi_acima_do_minimo(ndvi, destino, hoje),
        rebanho_cabe_na_area(rebanho, destino),
    ]
    return [m for m in motivos if m is not None]
