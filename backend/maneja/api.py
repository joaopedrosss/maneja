"""API REST do Maneja (SPEC-004). O JSON usa os mesmos nomes de src/lib/tipos.ts."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import Config, montar_sistema
from .dominio import ColeiraDesconhecida, Posicao, RegraViolada
from .servico import Conflito, Sistema

Quantidade = Annotated[int, Field(ge=0, strict=True)]


class PiqueteIn(BaseModel):
    nome: str
    vegetacao: str = ""
    geometria: dict
    externo_id: str | None = None


class FazendaIn(BaseModel):
    nome: str


class PiqueteEdicaoIn(BaseModel):
    nome: str | None = None
    vegetacao: str | None = None
    geometria: dict | None = None


class LotacaoIn(BaseModel):
    bois: Quantidade = 0
    vacas: Quantidade = 0
    bezerros: Quantidade = 0


class AceiteIn(BaseModel):
    destino_id: str | None = None


class AvancoIn(BaseModel):
    horas: float = Field(gt=0, le=24 * 30)


class ExecucaoIn(BaseModel):
    piquete_id: str | None = None


class PosicaoIn(BaseModel):
    coleira_id: str
    instante: datetime
    lat: float
    lon: float


def criar_app(sistema: Sistema | None = None) -> FastAPI:
    app = FastAPI(title="Maneja", version="0.1.0")
    app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])
    app.state.sistema = sistema or montar_sistema(Config.do_ambiente())

    def s() -> Sistema:
        return app.state.sistema

    def executar(acao):
        try:
            return jsonable_encoder(acao())
        except RegraViolada as e:
            raise HTTPException(status_code=422, detail=e.motivos) from e
        except ColeiraDesconhecida as e:
            raise HTTPException(status_code=422, detail=[str(e)]) from e
        except Conflito as e:
            raise HTTPException(status_code=409, detail=str(e)) from e
        except KeyError as e:
            raise HTTPException(status_code=404, detail=f"não encontrado: {e.args[0]}") from e

    @app.get("/saude")
    def saude() -> dict[str, Any]:
        return {"status": "ok", "modo_seugado": s().seugado.modo, "agora": s().agora().isoformat()}

    @app.get("/fazenda")
    def fazenda():
        return jsonable_encoder(s().repo.fazenda)

    @app.put("/fazenda")
    def atualizar_fazenda(corpo: FazendaIn):
        return executar(lambda: s().atualizar_fazenda(corpo.nome))

    @app.get("/piquetes")
    def piquetes():
        return jsonable_encoder(s().repo.piquetes)

    @app.post("/piquetes", status_code=201)
    def criar_piquete(corpo: PiqueteIn):
        return executar(lambda: s().criar_piquete(corpo.nome, corpo.vegetacao, corpo.geometria, corpo.externo_id))

    @app.put("/piquetes/{piquete_id}")
    def atualizar_piquete(piquete_id: str, corpo: PiqueteEdicaoIn):
        return executar(lambda: s().atualizar_piquete(piquete_id, corpo.nome, corpo.vegetacao, corpo.geometria))

    @app.delete("/piquetes/{piquete_id}", status_code=204)
    def remover_piquete(piquete_id: str):
        executar(lambda: s().remover_piquete(piquete_id))

    @app.get("/lotacao")
    def lotacao():
        return jsonable_encoder(s().repo.lotacao)

    @app.put("/lotacao/{piquete_id}")
    def atualizar_lotacao(piquete_id: str, corpo: LotacaoIn):
        return executar(lambda: s().atualizar_lotacao(piquete_id, corpo.bois, corpo.vacas, corpo.bezerros))

    @app.get("/ndvi")
    def ndvi(piquete_id: str | None = None):
        return jsonable_encoder([l for l in s().repo.ndvi if piquete_id in (None, l.piquete_id)])

    @app.get("/clima")
    def clima():
        return jsonable_encoder(s().previsao())

    @app.get("/resumo")
    def resumo():
        return jsonable_encoder(s().resumo())

    @app.post("/plano")
    def gerar_plano():
        return executar(lambda: s().gerar_plano())

    @app.get("/plano")
    def plano_atual():
        if s().repo.plano_atual is None:
            raise HTTPException(status_code=404, detail="ainda não há plano")
        return jsonable_encoder(s().repo.plano_atual)

    @app.post("/movimentacoes/{mov_id}/aceitar")
    def aceitar(mov_id: str, corpo: AceiteIn | None = Body(default=None)):
        destino = corpo.destino_id if corpo else None
        return executar(lambda: s().aceitar(mov_id, destino))

    @app.post("/movimentacoes/{mov_id}/recusar")
    def recusar(mov_id: str):
        return executar(lambda: s().recusar(mov_id))

    @app.get("/historico")
    def historico():
        return jsonable_encoder(s().repo.historico)

    @app.get("/coleiras")
    def coleiras():
        return jsonable_encoder(s().coleiras())

    @app.post("/coleiras/posicoes")
    def registrar_posicoes(corpo: list[PosicaoIn]):
        return executar(lambda: {"registradas": s().registrar_posicoes(
            [Posicao(p.coleira_id, p.instante, p.lat, p.lon) for p in corpo])})

    @app.get("/ocupacao")
    def ocupacao():
        return jsonable_encoder(s().ocupacao())

    @app.get("/verificacoes")
    def verificacoes():
        lista, avisos = s().verificacoes()
        return jsonable_encoder({"verificacoes": lista, "avisos": avisos})

    @app.post("/simulador/avancar")
    def avancar(corpo: AvancoIn):
        return executar(lambda: {"posicoes_geradas": s().simulador_avancar(corpo.horas), "agora": s().agora()})

    @app.post("/simulador/executar/{mov_id}")
    def executar_no_campo(mov_id: str, corpo: ExecucaoIn | None = Body(default=None)):
        destino = corpo.piquete_id if corpo else None
        return executar(lambda: s().simulador_executar(mov_id, destino) or {"ok": True})

    @app.get("/integracao/v1/execucoes")
    def execucoes(desde: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$")):
        return jsonable_encoder(s().execucoes(desde))

    return app


app = criar_app()
