"""Monitoramento (support): leitura das coleiras e ocupação estimada por piquete."""

from __future__ import annotations

from datetime import datetime, timedelta

from .dominio import Coleira, ColeiraDesconhecida, OcupacaoPiquete, Piquete, Posicao
from .geo import contem

JANELA_RECENTE_H = 6


def validar_posicoes(posicoes: list[Posicao], coleiras: list[Coleira]) -> None:
    """Critério de qualidade 2.1.1: posição de coleira desconhecida é rejeitada, nunca criada em silêncio."""
    conhecidas = {c.id for c in coleiras}
    desconhecidas = sorted({p.coleira_id for p in posicoes if p.coleira_id not in conhecidas})
    if desconhecidas:
        raise ColeiraDesconhecida(f"coleira não cadastrada: {', '.join(desconhecidas)}")


def ultimas_posicoes(posicoes: list[Posicao], agora: datetime) -> dict[str, Posicao]:
    """Última posição de cada coleira dentro da janela recente."""
    limite = agora - timedelta(hours=JANELA_RECENTE_H)
    ultimas: dict[str, Posicao] = {}
    for p in posicoes:
        if p.instante < limite or p.instante > agora:
            continue
        atual = ultimas.get(p.coleira_id)
        if atual is None or p.instante >= atual.instante:
            ultimas[p.coleira_id] = p
    return ultimas


def piquete_da_posicao(piquetes: list[Piquete], posicao: Posicao) -> str | None:
    return next((q.id for q in piquetes if contem(q.geometria, posicao.lat, posicao.lon)), None)


def ocupacao(piquetes: list[Piquete], coleiras: list[Coleira], posicoes: list[Posicao], agora: datetime) -> list[OcupacaoPiquete]:
    ultimas = ultimas_posicoes(posicoes, agora)
    onde = {cid: piquete_da_posicao(piquetes, pos) for cid, pos in ultimas.items()}
    resultado = []
    for p in piquetes:
        esperadas = [c for c in coleiras if c.piquete_cadastro_id == p.id]
        observadas = [cid for cid, pid in onde.items() if pid == p.id]
        sem_sinal = sum(1 for c in esperadas if c.id not in ultimas)
        if not esperadas and not observadas:
            situacao = "sem_coleiras"
        elif {c.id for c in esperadas if c.id in ultimas} == set(observadas):
            situacao = "confere"
        else:
            situacao = "diverge"
        resultado.append(OcupacaoPiquete(p.id, p.nome, len(esperadas), len(observadas), sem_sinal, situacao))
    return resultado
