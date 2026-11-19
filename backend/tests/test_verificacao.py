"""SPEC-003 · Planejado × realizado."""

from pytest_bdd import given, parsers, scenarios, then, when

from conftest import piquete_id, sistema

scenarios("verificacao.feature")


@given(parsers.parse('uma movimentação aceita do "{origem}" para o "{destino}"'))
def movimentacao_aceita(ctx, origem, destino):
    s = sistema(ctx)
    plano = s.gerar_plano()
    mov = next(m for m in plano.movimentacoes if m.piquete_origem_nome == origem)
    ctx["mov"] = s.aceitar(mov.id, piquete_id(ctx, destino))


@given(parsers.parse('o gado levado ao "{destino}" no campo'))
def gado_levado(ctx, destino):
    s = sistema(ctx)
    if "mov" in ctx:
        mov_id = ctx["mov"].id
    else:  # plano do SeuGado: a primeira movimentação com vínculo
        verificacoes, _ = s.verificacoes()
        mov_id = next(v.movimentacao_id for v in verificacoes if v.origem_plano == "seugado" and v.status != "sem_vinculo")
    s.simulador_executar(mov_id, piquete_id(ctx, destino))


@given(parsers.parse("passaram {dias:d} dias"))
def passaram_dias(ctx, dias):
    sistema(ctx).simulador_avancar(24 * dias)


@given("todas as coleiras sem sinal")
def sem_sinal(ctx):
    s = sistema(ctx)
    s.simulador.perda_sinal = 1.0
    s.simulador_avancar(7)  # as posições antigas saem da janela de 6 h


@when("o sistema verifica a movimentação")
def verifica_uma(ctx):
    verificacoes, _ = sistema(ctx).verificacoes()
    ctx["verificacao"] = next(v for v in verificacoes if v.movimentacao_id == ctx["mov"].id)


@when("o sistema verifica as movimentações")
def verifica_todas(ctx):
    ctx["verificacoes"], ctx["avisos"] = sistema(ctx).verificacoes()


@then(parsers.parse('o status é "{status}"'))
def status_e(ctx, status):
    assert ctx["verificacao"].status == status, ctx["verificacao"]


@then(parsers.parse('a movimentação do SeuGado aparece como "{status}"'))
def seugado_status(ctx, status):
    externas = [v for v in ctx["verificacoes"] if v.origem_plano == "seugado" and v.status != "sem_vinculo"]
    assert externas and externas[0].status == status, externas


@then("nenhuma verificação vem do SeuGado")
def nenhuma_do_seugado(ctx):
    assert all(v.origem_plano == "maneja" for v in ctx["verificacoes"])


@then("não há aviso de plano externo")
def sem_aviso(ctx):
    assert ctx["avisos"] == []
