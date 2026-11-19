"""Sistema: liga o repositório, os adaptadores e os componentes do domínio (a montagem do DC)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from . import agente as agente_mod
from .adaptadores.coleiras import SimuladorColeiras
from .adaptadores.seugado import ISeuGado, SeuGadoDesligado
from .datas import hoje_na_fazenda
from .dominio import (
    CATEGORIAS,
    Lotacao,
    Movimentacao,
    OcupacaoPiquete,
    Piquete,
    PlanoManejo,
    Posicao,
    PrevisaoClima,
    RegraViolada,
    ResumoPiquete,
    Verificacao,
)
from .geo import area_ha, centro, poligono_valido
from .monitoramento import ocupacao, piquete_da_posicao, ultimas_posicoes, validar_posicoes
from .ndvi import lotacao_de, resumo_piquetes
from .regras import validar_movimento
from .repositorio import RepositorioMemoria
from .verificacao import coleiras_do_grupo, movimentacoes_externas, verificar


class Conflito(Exception):
    """A operação não vale para o estado atual (por exemplo, aceitar o que já foi aceito)."""


class Relogio:
    """Hora real mais um deslocamento que o simulador avança."""

    def __init__(self, inicio: datetime | None = None) -> None:
        self._inicio = inicio
        self.deslocamento = timedelta()

    def agora(self) -> datetime:
        base = self._inicio or datetime.now(timezone.utc)
        return base + self.deslocamento

    def avancar(self, horas: float) -> None:
        self.deslocamento += timedelta(hours=horas)


class Sistema:
    def __init__(self, repo: RepositorioMemoria, clima, simulador: SimuladorColeiras, relogio: Relogio,
                 llm=None, seugado: ISeuGado | None = None) -> None:
        self.repo, self.clima, self.simulador, self.relogio = repo, clima, simulador, relogio
        self.llm = llm
        self.seugado = seugado or SeuGadoDesligado()

    # ---------- tempo ----------
    def agora(self) -> datetime:
        return self.relogio.agora()

    def hoje(self) -> str:
        return hoje_na_fazenda(self.agora(), self.repo.fazenda.timezone)

    # ---------- leitura ----------
    def previsao(self) -> PrevisaoClima:
        lat, lon = centro(self.repo.piquetes[0].geometria) if self.repo.piquetes else (0.0, 0.0)
        return self.clima.previsao(self.repo.fazenda.id, lat, lon, self.hoje())

    def resumo(self) -> list[ResumoPiquete]:
        return resumo_piquetes(self.repo.piquetes, self.repo.ndvi, self.repo.lotacao, self.hoje())

    # ---------- cadastros ----------
    def criar_piquete(self, nome: str, vegetacao: str, geometria: dict, externo_id: str | None = None) -> Piquete:
        if not nome.strip():
            raise RegraViolada(["o nome do piquete é obrigatório"])
        if not poligono_valido(geometria):
            raise RegraViolada(["o polígono precisa de pelo menos 3 pontos distintos e área maior que zero"])
        piquete = Piquete(f"pq-{uuid.uuid4().hex[:8]}", self.repo.fazenda.id, nome.strip(), geometria,
                          area_ha(geometria), vegetacao, externo_id)
        self.repo.piquetes.append(piquete)
        self.simulador.atualizar_piquetes(self.repo.piquetes)
        return piquete

    def atualizar_lotacao(self, piquete_id: str, bois: int, vacas: int, bezerros: int) -> Lotacao:
        if not any(p.id == piquete_id for p in self.repo.piquetes):
            raise KeyError(piquete_id)
        for nome_cat, qtd in zip(CATEGORIAS, (bois, vacas, bezerros)):
            if not isinstance(qtd, int) or isinstance(qtd, bool) or qtd < 0:
                raise RegraViolada([f"quantidade inválida de {nome_cat}: {qtd}"])
        atual = next((l for l in self.repo.lotacao if l.piquete_id == piquete_id), None)
        if atual is None:
            atual = Lotacao(piquete_id, self.repo.fazenda.id, 0, 0, 0, None)
            self.repo.lotacao.append(atual)
        estava_vazio = atual.rebanho.total == 0
        atual.bois, atual.vacas, atual.bezerros = bois, vacas, bezerros
        if estava_vazio and atual.rebanho.total > 0:
            atual.desde = self.hoje()
        return atual

    # ---------- agente ----------
    def gerar_plano(self) -> PlanoManejo:
        entrada = agente_mod.EntradaAgente(self.repo.piquetes, self.repo.ndvi, self.previsao(),
                                           self.repo.lotacao, self.repo.historico)
        self.repo.plano_atual = agente_mod.gerar_plano(entrada, self.hoje(), self.agora(), self.llm)
        return self.repo.plano_atual

    def _pendente(self, mov_id: str) -> Movimentacao:
        plano = self.repo.plano_atual
        mov = next((m for m in plano.movimentacoes if m.id == mov_id), None) if plano else None
        if mov is None:
            raise KeyError(mov_id)
        if mov.status != "pendente":
            raise Conflito(f"a movimentação já está {mov.status}")
        return mov

    def aceitar(self, mov_id: str, destino_id: str | None = None) -> Movimentacao:
        mov = self._pendente(mov_id)
        hoje = self.hoje()
        origem_lot = lotacao_de(self.repo.lotacao, mov.piquete_origem_id)
        if origem_lot is None:
            raise RegraViolada([f"{mov.piquete_origem_nome} não tem mais rebanho cadastrado"])
        destino_id = destino_id or mov.piquete_destino_id
        falhas = validar_movimento(destino_id, origem_lot.rebanho, self.repo.piquetes, self.repo.ndvi,
                                   self.repo.lotacao, hoje)
        if falhas:
            raise RegraViolada(falhas)
        destino = next(p for p in self.repo.piquetes if p.id == destino_id)

        # coleiras do grupo: as que estão de fato na origem agora (base do planejado × realizado)
        mov.coleiras = coleiras_do_grupo(mov.piquete_origem_id, self.repo.coleiras, self.repo.piquetes,
                                         self.repo.posicoes, self.agora(), incluir_cadastro=False)
        # o cadastro passa a dizer que o rebanho está no destino; o campo só muda quando o gado for levado
        rebanho = origem_lot.rebanho
        self.repo.lotacao = [l for l in self.repo.lotacao if l.piquete_id not in (mov.piquete_origem_id, destino_id)]
        self.repo.lotacao.append(Lotacao(destino_id, self.repo.fazenda.id, rebanho.bois, rebanho.vacas,
                                         rebanho.bezerros, hoje))
        for c in self.repo.coleiras:
            if c.piquete_cadastro_id == mov.piquete_origem_id:
                c.piquete_cadastro_id = destino_id

        trocado = destino_id != mov.piquete_destino_id
        if trocado:
            leitura = next((l for l in sorted(self.repo.ndvi, key=lambda l: l.data, reverse=True)
                            if l.piquete_id == destino_id and l.data <= hoje), None)
            mov.piquete_destino_id, mov.piquete_destino_nome = destino.id, destino.nome
            mov.ndvi_destino = leitura.valor if leitura else None
            mov.explicacao = f"{mov.explicacao} Destino trocado pelo produtor para {destino.nome}."
        mov.status = "trocada" if trocado else "aceita"
        mov.destino_trocado = trocado
        self.repo.historico.insert(0, mov)
        return mov

    def recusar(self, mov_id: str) -> Movimentacao:
        mov = self._pendente(mov_id)
        mov.status = "recusada"
        self.repo.historico.insert(0, mov)
        return mov

    # ---------- coleiras ----------
    def registrar_posicoes(self, posicoes: list[Posicao]) -> int:
        validar_posicoes(posicoes, self.repo.coleiras)
        self.repo.posicoes.extend(posicoes)
        return len(posicoes)

    def coleiras(self) -> list[dict]:
        ultimas = ultimas_posicoes(self.repo.posicoes, self.agora())
        resultado = []
        for c in self.repo.coleiras:
            pos = ultimas.get(c.id)
            resultado.append({
                "id": c.id,
                "categoria": c.categoria,
                "piquete_cadastro_id": c.piquete_cadastro_id,
                "piquete_observado_id": piquete_da_posicao(self.repo.piquetes, pos) if pos else None,
                "ultima_posicao": {"lat": pos.lat, "lon": pos.lon, "instante": pos.instante.isoformat()} if pos else None,
            })
        return resultado

    def ocupacao(self) -> list[OcupacaoPiquete]:
        return ocupacao(self.repo.piquetes, self.repo.coleiras, self.repo.posicoes, self.agora())

    # ---------- planejado × realizado ----------
    def verificacoes(self) -> tuple[list[Verificacao], list[str]]:
        agora, hoje = self.agora(), self.hoje()
        planejadas = [m for m in self.repo.historico if m.status in ("aceita", "trocada") and m.coleiras]
        avisos: list[str] = []
        try:
            plano = self.seugado.plano_atual()
        except Exception:  # noqa: BLE001 - o SeuGado nunca derruba o Maneja
            plano, avisos = None, ["plano_externo_indisponivel"]
        if plano:
            planejadas += movimentacoes_externas(plano, self.repo.piquetes, self.repo.coleiras,
                                                 self.repo.posicoes, agora, self.repo.grupos_externos)
        return [verificar(m, self.repo.piquetes, self.repo.posicoes, agora, hoje) for m in planejadas], avisos

    def execucoes(self, desde: str) -> list[dict]:
        verificacoes, _ = self.verificacoes()
        return [{
            "movimentacao_externa_id": v.externo_id,
            "piquete_origem_externo_id": v.piquete_origem_externo_id,
            "piquete_destino_externo_id": v.piquete_destino_externo_id,
            "status": v.status,
            "fracao_no_destino": v.fracao_no_destino,
            "coleiras_consideradas": v.coleiras_consideradas,
            "observado_em": v.observado_em,
        } for v in verificacoes if v.origem_plano == "seugado" and v.data >= desde]

    # ---------- simulador do campo ----------
    def gerar_posicoes(self) -> int:
        return self.registrar_posicoes(self.simulador.gerar_posicoes(self.agora()))

    def simulador_avancar(self, horas: float) -> int:
        self.relogio.avancar(horas)
        return self.gerar_posicoes()

    def simulador_executar(self, mov_id: str, piquete_id: str | None = None) -> None:
        """O gado da movimentação é levado no campo (para o destino ou para outro piquete)."""
        candidatas = list(self.repo.historico)
        plano = self.seugado_plano_seguro()
        if plano:
            candidatas += movimentacoes_externas(plano, self.repo.piquetes, self.repo.coleiras,
                                                 self.repo.posicoes, self.agora(), self.repo.grupos_externos)
        mov = next((m for m in candidatas if m.id == mov_id and m.status in ("aceita", "trocada")), None)
        if mov is None:
            raise KeyError(mov_id)
        alvo = piquete_id or mov.piquete_destino_id
        if not any(p.id == alvo for p in self.repo.piquetes):
            raise KeyError(alvo)
        self.simulador.mover(mov.coleiras, alvo)
        self.gerar_posicoes()

    def seugado_plano_seguro(self) -> dict | None:
        try:
            return self.seugado.plano_atual()
        except Exception:  # noqa: BLE001
            return None
