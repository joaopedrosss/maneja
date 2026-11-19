"""SPEC-001 · Agente de manejo e regras."""

from pytest_bdd import given, parsers, scenarios, then, when

from conftest import piquete_id, sistema
from maneja.adaptadores.clima import ClimaSimulado
from maneja.adaptadores.llm import ControleDeCota, LLMFixo
from maneja.datas import somar_dias
from maneja.dominio import LeituraNdvi, Movimentacao, Rebanho

scenarios("agente.feature")


@given(parsers.parse("todos os piquetes livres com NDVI {valor}"))
def livres_com_ndvi(ctx, valor):
    s = sistema(ctx)
    ocupados = {l.piquete_id for l in s.repo.lotacao if l.rebanho.total > 0}
    for p in s.repo.piquetes:
        if p.id not in ocupados:
            s.repo.ndvi.append(LeituraNdvi(p.id, s.hoje(), float(valor.replace(",", "."))))


@given(parsers.parse("chuva de {mm:d} mm hoje"))
def chuva_hoje(ctx, mm):
    sistema(ctx).clima = ClimaSimulado([mm, 0, 0, 0, 0, 0, 0])


@given(parsers.parse('a rota "{origem}" para "{destino}" recusada há {dias:d} dias'))
def rota_recusada(ctx, origem, destino, dias):
    s = sistema(ctx)
    s.repo.historico.insert(0, Movimentacao(
        id="mov-recusada", data=somar_dias(s.hoje(), -dias), rebanho=Rebanho(12, 6, 5),
        piquete_origem_id=piquete_id(ctx, origem), piquete_origem_nome=origem,
        piquete_destino_id=piquete_id(ctx, destino), piquete_destino_nome=destino,
        ndvi_origem=0.3, ndvi_destino=0.7, motivo="", confianca="alta", motivo_confianca="",
        status="recusada", destino_trocado=False, destino_recomendado_nome=destino,
    ))


@given(parsers.parse('um LLM que responde "{texto}"'))
def llm_fixo(ctx, texto):
    sistema(ctx).llm = ControleDeCota(LLMFixo(texto), limite=10)


@when("o agente gera o plano")
def gera_plano(ctx):
    ctx["plano"] = sistema(ctx).gerar_plano()


@then(parsers.parse('há uma movimentação de "{origem}" para "{destino}"'))
def ha_movimentacao(ctx, origem, destino):
    movs = [(m.piquete_origem_nome, m.piquete_destino_nome) for m in ctx["plano"].movimentacoes]
    assert (origem, destino) in movs, movs


@then(parsers.parse('o motivo explica que "{piquete}" foi descartado porque o rebanho não cabe'))
def motivo_descartado(ctx, piquete):
    motivo = ctx["plano"].movimentacoes[0].motivo
    assert f"não cabe em {piquete}" in motivo, motivo


@then("não há movimentação")
def sem_movimentacao(ctx):
    assert ctx["plano"].movimentacoes == []


@then(parsers.parse('há um alerta "{tipo}"'))
def ha_alerta(ctx, tipo):
    assert tipo in [a.tipo for a in ctx["plano"].alertas]


@then("a movimentação fica para amanhã")
def fica_para_amanha(ctx):
    s = sistema(ctx)
    mov = ctx["plano"].movimentacoes[0]
    assert mov.data == somar_dias(s.hoje(), 1)
    assert "Adiado" in mov.motivo


@then(parsers.parse('a movimentação não vai para "{destino}"'))
def nao_vai_para(ctx, destino):
    assert ctx["plano"].movimentacoes, "esperava uma movimentação"
    assert all(m.piquete_destino_nome != destino for m in ctx["plano"].movimentacoes)


@then("a explicação da movimentação vem da regra")
def explicacao_da_regra(ctx):
    mov = ctx["plano"].movimentacoes[0]
    assert mov.explicacao_origem == "regra"
    assert mov.explicacao == mov.motivo


@then("a explicação da movimentação vem do LLM")
def explicacao_do_llm(ctx):
    assert ctx["plano"].movimentacoes[0].explicacao_origem == "llm"
