"""SPEC-004 · API REST."""

from pytest_bdd import parsers, scenarios, then, when

from conftest import cliente, piquete_id

scenarios("api.feature")


@when(parsers.parse('eu consulto "{caminho}"'))
def consulto(ctx, caminho):
    ctx["resposta"] = cliente(ctx).get(caminho)


@when(parsers.parse("eu crio um piquete com {n:d} pontos"))
def crio_piquete(ctx, n):
    pontos = [[-35.97, -9.62], [-35.969, -9.62], [-35.969, -9.619]][:n]
    geometria = {"type": "Polygon", "coordinates": [pontos + [pontos[0]]]}
    ctx["resposta"] = cliente(ctx).post("/piquetes", json={"nome": "Novo", "vegetacao": "Marandu", "geometria": geometria})


@when("eu gero o plano")
def gero_plano(ctx):
    ctx["plano"] = cliente(ctx).post("/plano").json()


def _mov_da_origem(ctx, origem):
    return next(m for m in ctx["plano"]["movimentacoes"] if m["piquete_origem_nome"] == origem)


@when(parsers.parse('aceito a movimentação do "{origem}"'))
def aceito(ctx, origem):
    ctx["mov"] = _mov_da_origem(ctx, origem)
    ctx["resposta"] = cliente(ctx).post(f"/movimentacoes/{ctx['mov']['id']}/aceitar")
    assert ctx["resposta"].status_code == 200, ctx["resposta"].text


@when(parsers.parse('aceito a movimentação do "{origem}" trocando o destino para "{destino}"'))
def aceito_trocando(ctx, origem, destino):
    mov = _mov_da_origem(ctx, origem)
    ctx["resposta"] = cliente(ctx).post(f"/movimentacoes/{mov['id']}/aceitar",
                                        json={"destino_id": piquete_id(ctx, destino)})


@when("o gado é levado no campo")
def levado(ctx):
    r = cliente(ctx).post(f"/simulador/executar/{ctx['mov']['id']}")
    assert r.status_code == 200, r.text


@when("eu consulto as verificações")
def consulto_verificacoes(ctx):
    ctx["verificacoes"] = cliente(ctx).get("/verificacoes").json()["verificacoes"]


@then(parsers.parse('a movimentação aparece como "{status}"'))
def aparece_como(ctx, status):
    v = next(v for v in ctx["verificacoes"] if v["movimentacao_id"] == ctx["mov"]["id"])
    assert v["status"] == status, v


@then(parsers.parse('cada item tem "{campo1}" e "{campo2}"'))
def cada_item(ctx, campo1, campo2):
    itens = ctx["resposta"].json()
    assert itens, "lista vazia"
    assert all(campo1 in i and campo2 in i for i in itens)
