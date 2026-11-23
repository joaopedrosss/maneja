"""Armazenamento em memória. A SPEC-008 troca por PostgreSQL mantendo a mesma interface."""

from __future__ import annotations

from dataclasses import dataclass, field

from .dominio import Coleira, Fazenda, LeituraNdvi, Lotacao, Movimentacao, Piquete, PlanoManejo, Posicao


@dataclass
class RepositorioMemoria:
    fazenda: Fazenda
    piquetes: list[Piquete] = field(default_factory=list)
    lotacao: list[Lotacao] = field(default_factory=list)
    ndvi: list[LeituraNdvi] = field(default_factory=list)
    historico: list[Movimentacao] = field(default_factory=list)  # mais recente primeiro
    coleiras: list[Coleira] = field(default_factory=list)
    posicoes: list[Posicao] = field(default_factory=list)
    plano_atual: PlanoManejo | None = None
    grupos_externos: dict[str, list[str]] = field(default_factory=dict)  # coleiras de cada movimentação do SeuGado
