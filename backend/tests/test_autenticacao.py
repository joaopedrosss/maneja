"""SPEC-009 · Autenticação."""

from datetime import datetime, timedelta, timezone

from pytest_bdd import given, parsers, scenarios, when

from conftest import EMAIL_TESTE, SENHA_TESTE, cliente_anonimo

scenarios("autenticacao.feature")


def _login(ctx, senha):
    ctx["resposta"] = cliente_anonimo(ctx).post("/auth/token", json={"email": EMAIL_TESTE, "senha": senha})
    if ctx["resposta"].status_code == 200:
        ctx["token"] = ctx["resposta"].json()["access_token"]


@given(parsers.parse("um token emitido há {horas:d} horas"))
def token_antigo(ctx, horas):
    ctx["agora_auth"] = datetime.now(timezone.utc) - timedelta(hours=horas)
    _login(ctx, SENHA_TESTE)
    ctx["agora_auth"] = None


@given("um token com a assinatura trocada")
def token_adulterado(ctx):
    _login(ctx, SENHA_TESTE)
    cabecalho, carga, assinatura = ctx["token"].split(".")
    ctx["token"] = f"{cabecalho}.{carga}.{'A' if assinatura[0] != 'A' else 'B'}{assinatura[1:]}"


@when(parsers.parse('eu consulto "{caminho}" sem token'))
def sem_token(ctx, caminho):
    ctx["resposta"] = cliente_anonimo(ctx).get(caminho)


@when("eu faço login com a senha certa")
def login_certo(ctx):
    _login(ctx, SENHA_TESTE)


@when(parsers.parse('eu faço login com a senha "{senha}"'))
def login_errado(ctx, senha):
    _login(ctx, senha)


@when(parsers.parse('consulto "{caminho}" com o token'))
@when(parsers.parse('eu consulto "{caminho}" com o token'))
def com_token(ctx, caminho):
    ctx["resposta"] = cliente_anonimo(ctx).get(caminho, headers={"Authorization": f"Bearer {ctx['token']}"})


@when(parsers.parse('o SeuGado consulta "{caminho}" com o token de integração'))
def seugado_consulta(ctx, caminho):
    ctx["resposta"] = cliente_anonimo(ctx).get(caminho, headers={"Authorization": "Bearer token-do-seugado"})
