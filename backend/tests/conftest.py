"""Passos BDD compartilhados entre as funcionalidades."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from pytest_bdd import given, parsers, then

from maneja.api import criar_app
from maneja.config import Config, montar_sistema

INICIO = datetime(2026, 11, 19, 13, 0, tzinfo=timezone.utc)  # quinta, 10h em Maceió


@pytest.fixture
def ctx() -> dict:
    return {}


def sistema_demo(**config) -> object:
    return montar_sistema(Config(perda_sinal=0.0, semente=7, **config), inicio=INICIO)


def sistema(ctx: dict):
    if "sistema" not in ctx:
        ctx["sistema"] = sistema_demo()
    return ctx["sistema"]


def cliente(ctx: dict) -> TestClient:
    if "cliente" not in ctx:
        ctx["cliente"] = TestClient(criar_app(sistema(ctx)))
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
