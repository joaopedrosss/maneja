"""Passos BDD compartilhados entre as funcionalidades."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from pytest_bdd import given, parsers, then

from maneja.api import criar_app
from maneja.autenticacao import ConfigAuth, hash_senha
from maneja.config import Config, montar_sistema

INICIO = datetime(2026, 11, 19, 13, 0, tzinfo=timezone.utc)  # quinta, 10h em Maceió
EMAIL_TESTE, SENHA_TESTE = "tecnico@maneja.app", "senha-de-teste"
AUTH_TESTE = ConfigAuth(EMAIL_TESTE, hash_senha(SENHA_TESTE, iteracoes=1_000), "segredo-de-teste", "token-do-seugado")


@pytest.fixture
def ctx() -> dict:
    return {}


def sistema_demo(**config) -> object:
    return montar_sistema(Config(perda_sinal=0.0, semente=7, **config), inicio=INICIO)


def sistema(ctx: dict):
    if "sistema" not in ctx:
        ctx["sistema"] = sistema_demo()
    return ctx["sistema"]


def cliente_anonimo(ctx: dict) -> TestClient:
    """Cliente sem login (o relógio dos tokens pode ser trocado em ctx["agora_auth"])."""
    if "anonimo" not in ctx:
        relogio = lambda: ctx.get("agora_auth") or datetime.now(timezone.utc)  # noqa: E731
        ctx["anonimo"] = TestClient(criar_app(sistema(ctx), AUTH_TESTE, relogio))
    return ctx["anonimo"]


def cliente(ctx: dict) -> TestClient:
    """Cliente já autenticado: todas as rotas de dados exigem token (SPEC-009)."""
    if "cliente" not in ctx:
        c = cliente_anonimo(ctx)
        token = c.post("/auth/token", json={"email": EMAIL_TESTE, "senha": SENHA_TESTE}).json()["access_token"]
        c.headers["Authorization"] = f"Bearer {token}"
        ctx["cliente"] = c
    return ctx["cliente"]


def piquete_id(ctx: dict, nome: str) -> str:
    return next(p.id for p in sistema(ctx).repo.piquetes if p.nome == nome)


@given("a fazenda de demonstração")
@given("a fazenda de demonstração sem perda de sinal")
def fazenda_demo(ctx):
    ctx["sistema"] = sistema_demo()


@given("a integração com o SeuGado em modo arquivo")
def seugado_arquivo(ctx):
    ctx["sistema"] = sistema_demo(seugado_modo="arquivo")


@given("a integração com o SeuGado desligada")
def seugado_desligado(ctx):
    ctx["sistema"] = sistema_demo(seugado_modo="desligado")


@then(parsers.parse("a resposta é {codigo:d}"))
def resposta_e(ctx, codigo):
    assert ctx["resposta"].status_code == codigo, ctx["resposta"].text
