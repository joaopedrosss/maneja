"""Planejado × realizado (core): a movimentação aconteceu no campo?"""

from __future__ import annotations

from datetime import datetime

from .datas import dias_entre
from .dominio import Coleira, Movimentacao, Piquete, Posicao, Rebanho, Verificacao
from .geo import contem
from .monitoramento import piquete_da_posicao, ultimas_posicoes

FRACAO_CUMPRIDA = 0.75  # critério de qualidade 2.1.2
MIN_COLEIRAS = 3
PRAZO_DIAS = 1


def coleiras_do_grupo(origem_id: str, coleiras: list[Coleira], piquetes: list[Piquete],
                      posicoes: list[Posicao], agora: datetime, incluir_cadastro: bool) -> list[str]:
    """Coleiras observadas na origem agora; sem sinal nenhum (ou com incluir_cadastro), também as do cadastro."""
    ultimas = ultimas_posicoes(posicoes, agora)
    observadas = [cid for cid, pos in ultimas.items() if piquete_da_posicao(piquetes, pos) == origem_id]
    cadastro = [c.id for c in coleiras if c.piquete_cadastro_id == origem_id]
    if incluir_cadastro or not observadas:
        return sorted(set(observadas) | set(cadastro))
    return sorted(observadas)


def verificar(mov: Movimentacao, piquetes: list[Piquete], posicoes: list[Posicao],
              agora: datetime, hoje: str) -> Verificacao:
    por_id = {p.id: p for p in piquetes}
    origem = por_id.get(mov.piquete_origem_id)
    destino = por_id.get(mov.piquete_destino_id)
    base = dict(
        movimentacao_id=mov.id,
        origem_plano=mov.origem_plano,
        externo_id=mov.externo_id,
        data=mov.data,
        piquete_origem_id=origem.id if origem else None,
        piquete_destino_id=destino.id if destino else None,
        piquete_origem_externo_id=origem.externo_id if origem else None,
        piquete_destino_externo_id=destino.externo_id if destino else None,
        observado_em=agora.isoformat(),
    )
    if origem is None or destino is None:
        return Verificacao(**base, status="sem_vinculo", fracao_no_destino=None, coleiras_consideradas=0)

    ultimas = ultimas_posicoes(posicoes, agora)
    com_sinal = [ultimas[c] for c in mov.coleiras if c in ultimas]
    if len(com_sinal) < MIN_COLEIRAS:
        return Verificacao(**base, status="sem_dados", fracao_no_destino=None, coleiras_consideradas=len(com_sinal))

    no_destino = sum(1 for p in com_sinal if contem(destino.geometria, p.lat, p.lon))
    fracao = no_destino / len(com_sinal)
    if fracao >= FRACAO_CUMPRIDA:
        status = "cumprida"
    elif dias_entre(mov.data, hoje) <= PRAZO_DIAS:
        status = "pendente"
    else:
        status = "divergente"
    return Verificacao(**base, status=status, fracao_no_destino=round(fracao, 2), coleiras_consideradas=len(com_sinal))


def movimentacoes_externas(plano: dict, piquetes: list[Piquete], coleiras: list[Coleira],
                           posicoes: list[Posicao], agora: datetime,
                           grupos: dict[str, list[str]]) -> list[Movimentacao]:
    """Converte o plano vigente do SeuGado (docs/02-integracao-seugado.md) em movimentações planejadas.

    `grupos` guarda as coleiras de cada movimentação externa na primeira vez que ela é vista
    (quem estava na origem quando o plano chegou). Sem isso, depois que o gado sai da origem,
    o grupo ficaria vazio.
    """
    por_externo = {p.externo_id: p for p in piquetes if p.externo_id}
    resultado = []
    for m in plano.get("movimentacoes", []):
        origem = por_externo.get(m.get("piquete_origem_id"))
        destino = por_externo.get(m.get("piquete_destino_id"))
        if m["id"] not in grupos and origem:
            grupos[m["id"]] = coleiras_do_grupo(origem.id, coleiras, piquetes, posicoes, agora, incluir_cadastro=True)
        grupo = grupos.get(m["id"], [])
        resultado.append(Movimentacao(
            id=f"seugado-{m['id']}",
            data=m["data"],
            rebanho=Rebanho(),
            piquete_origem_id=origem.id if origem else "",
            piquete_origem_nome=m.get("piquete_origem_nome") or "",
            piquete_destino_id=destino.id if destino else "",
            piquete_destino_nome=m.get("piquete_destino_nome") or "",
            ndvi_origem=None,
            ndvi_destino=None,
            motivo=m.get("motivo", ""),
            confianca="media",
            motivo_confianca="plano do SeuGado",
            status="aceita",
            destino_trocado=False,
            destino_recomendado_nome=m.get("piquete_destino_nome") or "",
            explicacao=m.get("motivo", ""),
            coleiras=grupo,
            origem_plano="seugado",
            externo_id=m["id"],
        ))
    return resultado
