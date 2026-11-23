"""AgenteDeManejo (core): decide as movimentações por regras e pede ao LLM só a explicação.

Mesmo algoritmo de gerarRecomendacao em src/lib/agente.ts:
1. os piquetes ocupados com NDVI abaixo de NDVI_SAIDA entram na fila, do pior para o melhor;
2. para cada um, tenta os piquetes livres do NDVI mais alto para o mais baixo;
3. o primeiro que passa em validar_movimento vira o destino; os reprovados viram explicação;
4. em dia de chuva forte a movimentação é adiada para o primeiro dia sem ela.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from .datas import data_com_dia, decimal, dias_entre
from .dominio import (
    Alerta,
    CotaEsgotada,
    LeituraNdvi,
    Lotacao,
    Movimentacao,
    Piquete,
    PlanoManejo,
    PrevisaoClima,
)
from .ndvi import confianca_da_leitura, motivo_confianca, ultima_leitura
from .regras import NDVI_MINIMO_DESTINO, validar_movimento

HORIZONTE_DIAS = 7
NDVI_SAIDA = 0.35  # abaixo disto o gado precisa sair (a validar)
NDVI_PASSANDO = 0.8  # acima disto o capim está passando do ponto (a validar)
NDVI_FALTA = 0.3  # abaixo disto falta capim (a validar)
SEMANA_SECA_MM = 5  # chuva total da semana abaixo disto (a validar)
CHUVA_FORTE_MM = 40  # não se move gado em dia com chuva igual ou maior (a validar)
RECUSA_VALE_DIAS = 7  # uma rota recusada não volta a ser sugerida neste prazo
EXPLICACAO_MAX_CARACTERES = 400


class ILLM(Protocol):
    def gerar_texto(self, prompt: str) -> str: ...


@dataclass
class EntradaAgente:
    piquetes: list[Piquete]
    ndvi: list[LeituraNdvi]
    clima: PrevisaoClima
    lotacao: list[Lotacao]
    historico: list[Movimentacao]


def novo_id(prefixo: str) -> str:
    return f"{prefixo}-{uuid.uuid4().hex[:10]}"


def explicacao_valida(texto: str, origem: str, destino: str) -> bool:
    """Validador do risco R3: o texto precisa citar origem e destino e ser curto."""
    texto = texto.strip()
    return 0 < len(texto) <= EXPLICACAO_MAX_CARACTERES and origem in texto and destino in texto


def montar_prompt(mov: Movimentacao, chuva_semana_mm: float) -> str:
    r = mov.rebanho
    return (
        "Você é um assistente de manejo rotacionado de gado. Explique ao pecuarista, em até duas frases "
        "e em português simples, a movimentação abaixo. Cite o piquete de origem e o de destino pelo nome. "
        "Não sugira outro destino.\n"
        f"Origem: {mov.piquete_origem_nome} (NDVI {mov.ndvi_origem:.2f}).\n"
        f"Destino: {mov.piquete_destino_nome} (NDVI {mov.ndvi_destino:.2f}).\n"
        f"Rebanho: {r.bois} bois, {r.vacas} vacas, {r.bezerros} bezerros.\n"
        f"Chuva prevista na semana: {chuva_semana_mm:.0f} mm.\n"
        f"Motivo calculado pelas regras: {mov.motivo}"
    )


def explicar(mov: Movimentacao, llm: ILLM | None, chuva_semana_mm: float) -> None:
    mov.explicacao, mov.explicacao_origem = mov.motivo, "regra"
    if llm is None:
        return
    try:
        texto = llm.gerar_texto(montar_prompt(mov, chuva_semana_mm))
    except CotaEsgotada:
        return
    except Exception:  # noqa: BLE001 - LLM fora do ar nunca derruba o plano
        return
    if explicacao_valida(texto, mov.piquete_origem_nome, mov.piquete_destino_nome):
        mov.explicacao, mov.explicacao_origem = texto.strip(), "llm"


def gerar_plano(entrada: EntradaAgente, hoje: str, agora: datetime, llm: ILLM | None = None) -> PlanoManejo:
    piquetes, ndvi, clima = entrada.piquetes, entrada.ndvi, entrada.clima
    ocupacao = [l for l in entrada.lotacao if l.rebanho.total > 0]
    por_id = {p.id: p for p in piquetes}

    def leitura(pid: str) -> LeituraNdvi | None:
        return ultima_leitura(ndvi, pid, hoje)

    def valor(pid: str) -> float | None:
        l = leitura(pid)
        return l.valor if l else None

    def conf(pid: str) -> dict:
        return {"confianca": confianca_da_leitura(leitura(pid), hoje),
                "motivo_confianca": motivo_confianca(leitura(pid), hoje)}

    def recusada_ha_pouco(origem: str, destino: str) -> bool:
        return any(
            m.status == "recusada" and m.piquete_origem_id == origem and m.piquete_destino_id == destino
            and dias_entre(m.data, hoje) <= RECUSA_VALE_DIAS
            for m in entrada.historico
        )

    data_manejo = next((d.data for d in clima.dias if d.chuva_mm < CHUVA_FORTE_MM), hoje)
    aviso_chuva = "" if data_manejo == hoje else f" Adiado para {data_com_dia(data_manejo)} por causa da chuva forte."
    chuva_semana = sum(d.chuva_mm for d in clima.dias)

    movimentacoes: list[Movimentacao] = []
    alertas: list[Alerta] = []
    lotacao_prevista = list(ocupacao)  # cada destino escolhido fica reservado para os próximos da fila

    fila = sorted(ocupacao, key=lambda l: valor(l.piquete_id) if valor(l.piquete_id) is not None else 1)
    for lot in fila:
        origem = lot.piquete_id
        ndvi_origem = valor(origem)
        if ndvi_origem is None or ndvi_origem >= NDVI_SAIDA:
            continue
        rebanho = lot.rebanho
        motivo_saida = (f"{por_id[origem].nome} está com NDVI {decimal(ndvi_origem, 2)}, "
                        f"abaixo de {decimal(NDVI_SAIDA, 2)}")
        ocupados_previstos = {l.piquete_id for l in lotacao_prevista}
        candidatos = sorted(
            (p for p in piquetes if p.id != origem and p.id not in ocupados_previstos and valor(p.id) is not None),
            key=lambda p: valor(p.id),
            reverse=True,
        )
        descartes: list[str] = []
        destino: Piquete | None = None
        for candidato in candidatos:
            if recusada_ha_pouco(origem, candidato.id):
                descartes.append(f"{candidato.nome} foi recusado há pouco")
                continue
            falhas = validar_movimento(candidato.id, rebanho, piquetes, ndvi, lotacao_prevista, hoje)
            if not falhas:
                destino = candidato
                break
            descartes.extend(falhas)
        explicacao = f" Descartado: {'; '.join(descartes)}." if descartes else ""

        if destino is None:
            alertas.append(Alerta(
                tipo="sem_piquete_apto",
                data=hoje,
                texto=(f"{motivo_saida}, mas nenhum piquete livre pode receber o rebanho. "
                       f"Considere suplementar ou reduzir a lotação.{explicacao}"),
                confianca="media",
                motivo_confianca="leituras de NDVI dos piquetes livres",
            ))
            continue

        ndvi_destino = valor(destino.id)
        mov = Movimentacao(
            id=novo_id("mov"),
            data=data_manejo,
            rebanho=rebanho,
            piquete_origem_id=origem,
            piquete_origem_nome=por_id[origem].nome,
            piquete_destino_id=destino.id,
            piquete_destino_nome=destino.nome,
            ndvi_origem=ndvi_origem,
            ndvi_destino=ndvi_destino,
            motivo=(f"{motivo_saida}. {destino.nome} é o piquete livre apto com NDVI mais alto: "
                    f"{decimal(ndvi_destino, 2)}.{explicacao}{aviso_chuva}"),
            confianca=confianca_da_leitura(leitura(destino.id), hoje),
            motivo_confianca=f"{motivo_confianca(leitura(destino.id), hoje)} no destino",
            status="pendente",
            destino_trocado=False,
            destino_recomendado_nome=destino.nome,
        )
        explicar(mov, llm, chuva_semana)
        movimentacoes.append(mov)
        lotacao_prevista.append(Lotacao(destino.id, lot.fazenda_id, lot.bois, lot.vacas, lot.bezerros, data_manejo))

    # ---------- alertas sobre os piquetes ----------
    ocupados = {l.piquete_id for l in ocupacao}
    destinos = {m.piquete_destino_id for m in movimentacoes}
    for p in piquetes:
        v = valor(p.id)
        if v is None:
            continue
        if v < NDVI_FALTA:
            alertas.append(Alerta("falta_capim", hoje, f"Falta capim em {p.nome}: NDVI {decimal(v, 2)}.", **conf(p.id)))
        if p.id in ocupados or p.id in destinos:
            continue
        if v >= NDVI_PASSANDO:
            alertas.append(Alerta("passando_do_ponto", hoje,
                                  f"{p.nome} está passando do ponto: NDVI {decimal(v, 2)}.", **conf(p.id)))
        elif v >= NDVI_MINIMO_DESTINO:
            alertas.append(Alerta("pronto_para_pastejo", hoje,
                                  f"{p.nome} está pronto para pastejo: NDVI {decimal(v, 2)}.", **conf(p.id)))

    # ---------- alertas de clima ----------
    for d in clima.dias:
        if d.chuva_mm >= CHUVA_FORTE_MM:
            alertas.append(Alerta("alerta_clima", d.data,
                                  f"Chuva forte prevista: {decimal(d.chuva_mm, 0)} mm. Evite mover o gado neste dia.",
                                  "media", "previsão do tempo de 7 dias"))
    if chuva_semana < SEMANA_SECA_MM:
        alertas.append(Alerta("alerta_clima", hoje,
                              f"Semana seca: só {decimal(chuva_semana, 0)} mm previstos. O pasto deve rebrotar devagar.",
                              "media", "previsão do tempo de 7 dias"))

    alertas.sort(key=lambda a: a.data)
    return PlanoManejo(
        id=novo_id("plano"),
        fazenda_id=clima.fazenda_id,
        data_geracao=agora.isoformat(),
        data_inicio=hoje,
        horizonte_dias=HORIZONTE_DIAS,
        movimentacoes=movimentacoes,
        alertas=alertas,
    )
