"""Tipos do domínio. Os nomes de campo são os mesmos de src/lib/tipos.ts (o JSON da API é igual)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

Confianca = Literal["alta", "media", "baixa"]
SituacaoPiquete = Literal["ocupado", "descansando"]
StatusMovimentacao = Literal["pendente", "aceita", "recusada", "trocada"]
TipoAlerta = Literal["sem_piquete_apto", "passando_do_ponto", "pronto_para_pastejo", "falta_capim", "alerta_clima"]
OrigemPlano = Literal["maneja", "seugado"]
StatusVerificacao = Literal["cumprida", "pendente", "divergente", "sem_dados", "sem_vinculo"]
SituacaoOcupacao = Literal["confere", "diverge", "sem_coleiras"]

CATEGORIAS = ("bois", "vacas", "bezerros")


class RegraViolada(Exception):
    """Movimentação reprovada pelas regras determinísticas."""

    def __init__(self, motivos: list[str]) -> None:
        super().__init__("; ".join(motivos))
        self.motivos = motivos


class ColeiraDesconhecida(Exception):
    """Posição de uma coleira que não está cadastrada (critério de qualidade 2.1.1)."""


class CotaEsgotada(Exception):
    """A cota gratuita do LLM acabou (risco R7)."""


@dataclass
class Fazenda:
    id: str
    nome: str
    timezone: str


@dataclass
class Piquete:
    id: str
    fazenda_id: str
    nome: str
    geometria: dict
    area_ha: float
    vegetacao: str
    externo_id: str | None = None  # id do mesmo piquete no SeuGado


@dataclass
class Rebanho:
    bois: int = 0
    vacas: int = 0
    bezerros: int = 0

    @property
    def total(self) -> int:
        return self.bois + self.vacas + self.bezerros


@dataclass
class Lotacao:
    piquete_id: str
    fazenda_id: str
    bois: int
    vacas: int
    bezerros: int
    desde: str | None

    @property
    def rebanho(self) -> Rebanho:
        return Rebanho(self.bois, self.vacas, self.bezerros)


@dataclass
class LeituraNdvi:
    piquete_id: str
    data: str
    valor: float


@dataclass
class PrevisaoDia:
    data: str
    chuva_mm: float
    temp_min_c: float
    temp_max_c: float


@dataclass
class PrevisaoClima:
    fazenda_id: str
    dias: list[PrevisaoDia]


@dataclass
class Movimentacao:
    id: str
    data: str
    rebanho: Rebanho
    piquete_origem_id: str
    piquete_origem_nome: str
    piquete_destino_id: str
    piquete_destino_nome: str
    ndvi_origem: float | None
    ndvi_destino: float | None
    motivo: str
    confianca: Confianca
    motivo_confianca: str
    status: StatusMovimentacao
    destino_trocado: bool
    destino_recomendado_nome: str
    explicacao: str = ""
    explicacao_origem: Literal["regra", "llm"] = "regra"
    coleiras: list[str] = field(default_factory=list)
    origem_plano: OrigemPlano = "maneja"
    externo_id: str | None = None


@dataclass
class Alerta:
    tipo: TipoAlerta
    data: str
    texto: str
    confianca: Confianca
    motivo_confianca: str


@dataclass
class ResumoPiquete:
    piquete_id: str
    nome: str
    vegetacao: str
    area_ha: float
    situacao: SituacaoPiquete
    rebanho: Rebanho | None
    ndvi: float | None
    data_ndvi: str | None
    confianca: Confianca
    motivo_confianca: str


@dataclass
class PlanoManejo:
    id: str
    fazenda_id: str
    data_geracao: str
    data_inicio: str
    horizonte_dias: int
    movimentacoes: list[Movimentacao]
    alertas: list[Alerta]


@dataclass
class Coleira:
    id: str
    categoria: str  # boi, vaca ou bezerro
    piquete_cadastro_id: str  # onde o cadastro diz que o animal está


@dataclass
class Posicao:
    coleira_id: str
    instante: datetime
    lat: float
    lon: float


@dataclass
class OcupacaoPiquete:
    piquete_id: str
    nome: str
    coleiras_esperadas: int
    coleiras_observadas: int
    sem_sinal: int
    situacao: SituacaoOcupacao


@dataclass
class Verificacao:
    movimentacao_id: str
    origem_plano: OrigemPlano
    externo_id: str | None
    data: str
    piquete_origem_id: str | None
    piquete_destino_id: str | None
    piquete_origem_externo_id: str | None
    piquete_destino_externo_id: str | None
    status: StatusVerificacao
    fracao_no_destino: float | None
    coleiras_consideradas: int
    observado_em: str
