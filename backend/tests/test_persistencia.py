"""SPEC-008 · Persistência em PostgreSQL (com um PostgreSQL embutido via pgserver)."""

import os
import tempfile

import psycopg
import pytest
from pytest_bdd import given, parsers, scenarios, then, when

from conftest import INICIO, cliente, piquete_id
from maneja.config import Config, montar_sistema
from maneja.geo import poligono_em_metros

scenarios("persistencia.feature")


@pytest.fixture(scope="session")
def url_banco():
    """DATABASE_URL_TESTE, se existir; senão, um PostgreSQL embutido. Sem nenhum dos dois, pula."""
    if os.environ.get("DATABASE_URL_TESTE"):
        yield os.environ["DATABASE_URL_TESTE"]
        return
    pgserver = pytest.importorskip("pgserver", reason="sem DATABASE_URL_TESTE e sem pgserver")
    servidor = pgserver.get_server(tempfile.mkdtemp(prefix="maneja-pg-"), cleanup_mode="stop")
    yield servidor.get_uri()
    servidor.cleanup()


@pytest.fixture
def banco_limpo(url_banco):
    with psycopg.connect(url_banco, autocommit=True) as conn:
        conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    return url_banco


def _config(url):
    return Config(perda_sinal=0.0, semente=7, database_url=url)


@given("o sistema com PostgreSQL", target_fixture="url")
def sistema_pg(ctx, banco_limpo):
    ctx["sistema"] = montar_sistema(_config(banco_limpo), inicio=INICIO)
    return banco_limpo


def _total(s):
    return sum(l.bois + l.vacas + l.bezerros for l in s.repo.lotacao)


@given(parsers.parse('uma movimentação aceita do "{origem}"'))
@when(parsers.parse('aceito a movimentação do "{origem}"'))
def aceita(ctx, origem):
    s = ctx["sistema"]
    ctx["total_antes"] = _total(s)
    plano = s.gerar_plano()
    mov = next(m for m in plano.movimentacoes if m.piquete_origem_nome == origem)
    ctx["mov"] = s.aceitar(mov.id)


@given("o gado levado ao destino no campo")
def levado(ctx):
    ctx["sistema"].simulador_executar(ctx["mov"].id)


@when("o sistema reinicia")
def reinicia(ctx, url):
    ctx.pop("cliente", None)
    ctx.pop("anonimo", None)
    ctx["sistema"] = montar_sistema(_config(url), inicio=INICIO)


@when(parsers.parse('eu crio o piquete "{nome}" pela API'))
def cria_pela_api(ctx, nome):
    geometria = poligono_em_metros((-9.6205, -35.9695), [(600, 0), (700, 0), (700, 100), (600, 100)])
    r = cliente(ctx).post("/piquetes", json={"nome": nome, "vegetacao": "Marandu", "geometria": geometria})
    assert r.status_code == 201, r.text


@then(parsers.parse("o banco tem {piquetes:d} piquetes e {coleiras:d} coleiras"))
def banco_tem(url, piquetes, coleiras):
    with psycopg.connect(url) as conn:
        assert conn.execute("SELECT count(*) FROM piquete").fetchone()[0] == piquetes
        assert conn.execute("SELECT count(*) FROM coleira").fetchone()[0] == coleiras


@then("o histórico ainda tem a movimentação")
def historico_tem(ctx):
    assert ctx["mov"].id in [m.id for m in ctx["sistema"].repo.historico]


@then(parsers.parse('o rebanho está no "{nome}"'))
def rebanho_no(ctx, nome):
    pid = piquete_id(ctx, nome)
    assert any(l.piquete_id == pid and l.bois + l.vacas + l.bezerros > 0 for l in ctx["sistema"].repo.lotacao)


@then("a soma do rebanho é igual à de antes")
def soma_igual(ctx):
    assert _total(ctx["sistema"]) == ctx["total_antes"]


@then(parsers.parse('a verificação da movimentação é "{status}"'))
def verificacao_e(ctx, status):
    verificacoes, _ = ctx["sistema"].verificacoes()
    v = next(v for v in verificacoes if v.movimentacao_id == ctx["mov"].id)
    assert v.status == status, v


@then(parsers.parse('existe o "{nome}"'))
def existe(ctx, nome):
    assert nome in [p.nome for p in ctx["sistema"].repo.piquetes]
