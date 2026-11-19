"""Repositório PostgreSQL (SPEC-008).

Mesma interface do RepositorioMemoria: os dados ficam em memória enquanto o processo roda,
e `salvar()` grava o estado inteiro numa única transação. Assim, uma movimentação aceita
atualiza lotação, histórico e coleiras juntos ou não atualiza nada (critério 2.2.1).
As posições das coleiras só crescem: cada `salvar()` grava apenas as novas.
"""

from __future__ import annotations

import dataclasses
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

from .dominio import (
    Alerta,
    Coleira,
    Fazenda,
    LeituraNdvi,
    Lotacao,
    Movimentacao,
    Piquete,
    PlanoManejo,
    Posicao,
    Rebanho,
)
from .repositorio import RepositorioMemoria

SCHEMA = Path(__file__).resolve().parent.parent / "db" / "schema.sql"
POSICOES_CARREGADAS_H = 24  # só as posições recentes interessam (ocupação e verificação usam 6 h)


def conectar(url: str) -> psycopg.Connection:
    """prepare_threshold=None: o pooler do Supabase em modo transação (porta 6543) não aceita prepared statements."""
    return psycopg.connect(url, prepare_threshold=None)


def movimentacao_de_dict(d: dict) -> Movimentacao:
    d = dict(d)
    d["rebanho"] = Rebanho(**d["rebanho"])
    campos = {f.name for f in dataclasses.fields(Movimentacao)}
    return Movimentacao(**{k: v for k, v in d.items() if k in campos})


def plano_de_dict(d: dict) -> PlanoManejo:
    return PlanoManejo(
        id=d["id"], fazenda_id=d["fazenda_id"], data_geracao=d["data_geracao"], data_inicio=d["data_inicio"],
        horizonte_dias=d["horizonte_dias"],
        movimentacoes=[movimentacao_de_dict(m) for m in d["movimentacoes"]],
        alertas=[Alerta(**a) for a in d["alertas"]],
    )


class RepositorioPg(RepositorioMemoria):
    def __init__(self, url: str, **campos) -> None:
        super().__init__(**campos)
        self.url = url
        self.fisico: dict[str, str] = {}  # piquete físico de cada coleira (estado do simulador)
        self.deslocamento_s: float = 0.0  # relógio do simulador
        self._posicoes_gravadas = 0

    # ---------- abrir ----------

    @classmethod
    def abrir(cls, url: str, semente: RepositorioMemoria | None) -> RepositorioPg:
        """Cria as tabelas, carrega o estado e, com o banco vazio, grava `semente` (a fazenda de demonstração)."""
        with conectar(url) as conn:
            # aplica o schema só se faltar alguma tabela (evita locks a cada requisição no modo sem estado)
            if conn.execute("SELECT to_regclass('public.parametro') IS NULL").fetchone()[0]:
                conn.execute(SCHEMA.read_text(encoding="utf-8"))
            vazio = conn.execute("SELECT count(*) FROM fazenda").fetchone()[0] == 0
        if vazio:
            base = semente or RepositorioMemoria(fazenda=Fazenda("fazenda", "Minha fazenda", "America/Maceio"))
            repo = cls(url, **{f.name: getattr(base, f.name) for f in dataclasses.fields(RepositorioMemoria)})
            repo.fisico = {c.id: c.piquete_cadastro_id for c in repo.coleiras}
            repo.salvar()
            return repo
        return cls._carregar(url)

    @classmethod
    def _carregar(cls, url: str) -> RepositorioPg:
        with conectar(url) as conn:
            desl = conn.execute("SELECT valor FROM parametro WHERE chave = 'deslocamento_relogio_s'").fetchone()
            deslocamento_s = float(desl[0]) if desl else 0.0
            f = conn.execute("SELECT id, nome, timezone FROM fazenda LIMIT 1").fetchone()
            repo = cls(url, fazenda=Fazenda(*f))
            repo.piquetes = [Piquete(*r) for r in conn.execute(
                "SELECT id, fazenda_id, nome, geometria, area_ha, vegetacao, externo_id FROM piquete ORDER BY ordem")]
            repo.lotacao = [Lotacao(r[0], r[1], r[2], r[3], r[4], r[5].isoformat() if r[5] else None) for r in conn.execute(
                "SELECT piquete_id, fazenda_id, bois, vacas, bezerros, desde FROM lotacao ORDER BY piquete_id")]
            repo.ndvi = [LeituraNdvi(r[0], r[1].isoformat(), r[2]) for r in conn.execute(
                "SELECT piquete_id, data, valor FROM leitura_ndvi ORDER BY piquete_id, data")]
            repo.historico = [movimentacao_de_dict(r[0]) for r in conn.execute(
                "SELECT dados FROM movimentacao ORDER BY ordem")]
            plano = conn.execute("SELECT dados FROM plano_atual").fetchone()
            repo.plano_atual = plano_de_dict(plano[0]) if plano else None
            linhas = conn.execute("SELECT id, categoria, piquete_cadastro_id, piquete_fisico_id FROM coleira ORDER BY ordem").fetchall()
            repo.coleiras = [Coleira(r[0], r[1], r[2]) for r in linhas]
            repo.fisico = {r[0]: r[3] for r in linhas}
            limite = datetime.now(timezone.utc) + timedelta(seconds=deslocamento_s) - timedelta(hours=POSICOES_CARREGADAS_H)
            repo.posicoes = [Posicao(*r) for r in conn.execute(
                "SELECT coleira_id, instante, lat, lon FROM posicao WHERE instante >= %s ORDER BY id", (limite,))]
            repo._posicoes_gravadas = len(repo.posicoes)
            repo.grupos_externos = {r[0]: list(r[1]) for r in conn.execute("SELECT externo_id, coleiras FROM grupo_externo")}
            repo.deslocamento_s = deslocamento_s
        return repo

    # ---------- salvar ----------

    def salvar(self) -> None:
        """Grava o estado inteiro numa transação (tudo ou nada)."""
        with conectar(self.url) as conn, conn.transaction():
            for tabela in ("lotacao", "leitura_ndvi", "movimentacao", "plano_atual", "coleira", "grupo_externo", "piquete", "fazenda"):
                conn.execute(f"DELETE FROM {tabela}")  # noqa: S608 - nomes fixos
            f = self.fazenda
            conn.execute("INSERT INTO fazenda VALUES (%s, %s, %s)", (f.id, f.nome, f.timezone))
            with conn.cursor() as cur:
                cur.executemany("INSERT INTO piquete VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", [
                    (p.id, p.fazenda_id, p.nome, Jsonb(p.geometria), p.area_ha, p.vegetacao, p.externo_id, i)
                    for i, p in enumerate(self.piquetes)])
                cur.executemany("INSERT INTO lotacao VALUES (%s, %s, %s, %s, %s, %s)", [
                    (l.piquete_id, l.fazenda_id, l.bois, l.vacas, l.bezerros, date.fromisoformat(l.desde) if l.desde else None)
                    for l in self.lotacao])
                cur.executemany("INSERT INTO leitura_ndvi VALUES (%s, %s, %s) ON CONFLICT DO NOTHING", [
                    (l.piquete_id, date.fromisoformat(l.data), l.valor) for l in self.ndvi])
                cur.executemany("INSERT INTO movimentacao VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING", [
                    (m.id, i, Jsonb(dataclasses.asdict(m))) for i, m in enumerate(self.historico)])
                if self.plano_atual is not None:
                    cur.execute("INSERT INTO plano_atual (dados) VALUES (%s)", (Jsonb(dataclasses.asdict(self.plano_atual)),))
                cur.executemany("INSERT INTO coleira VALUES (%s, %s, %s, %s, %s)", [
                    (c.id, c.categoria, c.piquete_cadastro_id, self.fisico.get(c.id, c.piquete_cadastro_id), i)
                    for i, c in enumerate(self.coleiras)])
                novas = self.posicoes[self._posicoes_gravadas:]
                cur.executemany("INSERT INTO posicao (coleira_id, instante, lat, lon) VALUES (%s, %s, %s, %s)", [
                    (p.coleira_id, p.instante, p.lat, p.lon) for p in novas])
                cur.executemany("INSERT INTO grupo_externo VALUES (%s, %s)", [
                    (k, Jsonb(v)) for k, v in self.grupos_externos.items()])
                cur.execute("INSERT INTO parametro VALUES ('deslocamento_relogio_s', %s) "
                            "ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor", (str(self.deslocamento_s),))
        self._posicoes_gravadas = len(self.posicoes)

