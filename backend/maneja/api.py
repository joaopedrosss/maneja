"""API REST do Maneja (SPEC-004 e SPEC-009). O JSON usa os mesmos nomes de src/lib/tipos.ts."""

from __future__ import annotations

import secrets
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .autenticacao import ConfigAuth, TokenInvalido, emitir_token, validar_token, verificar_senha
from .config import Config, auth_do_ambiente, montar_sistema
from .dominio import ColeiraDesconhecida, Posicao, RegraViolada
from .servico import Conflito, Sistema

Quantidade = Annotated[int, Field(ge=0, strict=True)]


class LoginIn(BaseModel):
    email: str
    senha: str


class FazendaIn(BaseModel):
    nome: str


class PiqueteIn(BaseModel):
    nome: str
    vegetacao: str = ""
    geometria: dict
    externo_id: str | None = None


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


def agora_real() -> datetime:
    return datetime.now(timezone.utc)


_sistema_da_requisicao: ContextVar[Sistema | None] = ContextVar("sistema_da_requisicao", default=None)


def criar_app(sistema: Sistema | None = None, auth: ConfigAuth | None = None, relogio=agora_real,
              config: Config | None = None) -> FastAPI:
    """`relogio` é a hora real usada nos tokens (o relógio do simulador não expira sessões).

    Modo sem estado (Vercel, SPEC-013): cada requisição monta o Sistema a partir do banco,
    e as operações que mudam dados gravam de volta antes de responder.
    """
    config = config or Config.do_ambiente()
    sem_estado = sistema is None and config.sem_estado
    if sem_estado and not config.database_url:
        raise RuntimeError("MANEJA_SEM_ESTADO exige DATABASE_URL")
    app = FastAPI(title="Maneja", version="0.3.0")
    app.add_middleware(CORSMiddleware, allow_origins=list(config.cors_origens),
                       allow_methods=["*"], allow_headers=["*"])
    app.state.sistema = None if sem_estado else (sistema or montar_sistema(config))
    app.state.auth = auth or auth_do_ambiente()

    if sem_estado:
        @app.middleware("http")
        async def sistema_por_requisicao(request: Request, call_next):
            if request.method == "OPTIONS":
                return await call_next(request)
            marca = _sistema_da_requisicao.set(await run_in_threadpool(montar_sistema, config))
            try:
                return await call_next(request)
            finally:
                _sistema_da_requisicao.reset(marca)

    def s() -> Sistema:
        return _sistema_da_requisicao.get() or app.state.sistema

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

    # ---------- autenticação (SPEC-009, critério de qualidade 4.2) ----------

    def nao_autorizado(motivo: str) -> HTTPException:
        return HTTPException(status_code=401, detail=motivo, headers={"WWW-Authenticate": "Bearer"})

    def token_do_cabecalho(authorization: str | None) -> str:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise nao_autorizado("faça login para continuar")
        return authorization.split(" ", 1)[1].strip()

    def exigir_usuario(authorization: str | None = Header(default=None)) -> str:
        token = token_do_cabecalho(authorization)
        try:
            return validar_token(token, app.state.auth.segredo, relogio())
        except TokenInvalido as e:
            raise nao_autorizado(f"sessão inválida: {e}") from e

    def exigir_usuario_ou_integracao(authorization: str | None = Header(default=None)) -> str:
        token = token_do_cabecalho(authorization)
        fixo = app.state.auth.token_integracao
        if fixo and secrets.compare_digest(token, fixo):
            return "integracao"
        return exigir_usuario(authorization)

    r = APIRouter(dependencies=[Depends(exigir_usuario)])
    integracao = APIRouter(dependencies=[Depends(exigir_usuario_ou_integracao)])

    @app.get("/saude")
    def saude() -> dict[str, Any]:
        return {"status": "ok", "modo_seugado": s().seugado.modo, "agora": s().agora().isoformat(),
                "banco": "postgresql" if config.database_url else "memoria", "sem_estado": sem_estado}

    @app.post("/auth/token")
    def login(corpo: LoginIn) -> dict[str, Any]:
        cfg = app.state.auth
        if corpo.email.strip().lower() != cfg.email.lower() or not verificar_senha(corpo.senha, cfg.senha_hash):
            raise nao_autorizado("e-mail ou senha incorretos")
        token, expira = emitir_token(cfg.email, cfg.segredo, relogio())
        return {"access_token": token, "token_type": "bearer", "expira_em": expira.isoformat(), "email": cfg.email}

    @r.get("/me")
    def eu(email: str = Depends(exigir_usuario)) -> dict[str, str]:
        return {"email": email}

    # ---------- dados ----------

    @r.get("/fazenda")
    def fazenda():
        return jsonable_encoder(s().repo.fazenda)

    @r.put("/fazenda")
    def atualizar_fazenda(corpo: FazendaIn):
        return executar(lambda: s().atualizar_fazenda(corpo.nome))

    @r.get("/piquetes")
    def piquetes():
        return jsonable_encoder(s().repo.piquetes)

    @r.post("/piquetes", status_code=201)
    def criar_piquete(corpo: PiqueteIn):
        return executar(lambda: s().criar_piquete(corpo.nome, corpo.vegetacao, corpo.geometria, corpo.externo_id))

    @r.put("/piquetes/{piquete_id}")
    def atualizar_piquete(piquete_id: str, corpo: PiqueteEdicaoIn):
        return executar(lambda: s().atualizar_piquete(piquete_id, corpo.nome, corpo.vegetacao, corpo.geometria))

    @r.delete("/piquetes/{piquete_id}", status_code=204)
    def remover_piquete(piquete_id: str):
        executar(lambda: s().remover_piquete(piquete_id))

    @r.get("/lotacao")
    def lotacao():
        return jsonable_encoder(s().repo.lotacao)

    @r.put("/lotacao/{piquete_id}")
    def atualizar_lotacao(piquete_id: str, corpo: LotacaoIn):
        return executar(lambda: s().atualizar_lotacao(piquete_id, corpo.bois, corpo.vacas, corpo.bezerros))

    @r.get("/ndvi")
    def ndvi(piquete_id: str | None = None):
        return jsonable_encoder([l for l in s().repo.ndvi if piquete_id in (None, l.piquete_id)])

    @r.get("/clima")
    def clima():
        return jsonable_encoder(s().previsao())

    @r.get("/resumo")
    def resumo():
        return jsonable_encoder(s().resumo())

    # ---------- agente ----------

    @r.post("/plano")
    def gerar_plano():
        return executar(lambda: s().gerar_plano())

    @r.get("/plano")
    def plano_atual():
        if s().repo.plano_atual is None:
            raise HTTPException(status_code=404, detail="ainda não há plano")
        return jsonable_encoder(s().repo.plano_atual)

    @r.post("/movimentacoes/{mov_id}/aceitar")
    def aceitar(mov_id: str, corpo: AceiteIn | None = Body(default=None)):
        destino = corpo.destino_id if corpo else None
        return executar(lambda: s().aceitar(mov_id, destino))

    @r.post("/movimentacoes/{mov_id}/recusar")
    def recusar(mov_id: str):
        return executar(lambda: s().recusar(mov_id))

    @r.get("/historico")
    def historico():
        return jsonable_encoder(s().repo.historico)

    # ---------- coleiras e planejado × realizado ----------

    @r.get("/coleiras")
    def coleiras():
        return jsonable_encoder(s().coleiras())

    @r.post("/coleiras/posicoes")
    def registrar_posicoes(corpo: list[PosicaoIn]):
        return executar(lambda: {"registradas": s().registrar_posicoes(
            [Posicao(p.coleira_id, p.instante, p.lat, p.lon) for p in corpo])})

    @r.get("/ocupacao")
    def ocupacao():
        return jsonable_encoder(s().ocupacao())

    @r.get("/verificacoes")
    def verificacoes():
        lista, avisos = s().verificacoes()
        return jsonable_encoder({"verificacoes": lista, "avisos": avisos})

    # ---------- simulador do campo ----------

    @r.post("/simulador/avancar")
    def avancar(corpo: AvancoIn):
        return executar(lambda: {"posicoes_geradas": s().simulador_avancar(corpo.horas), "agora": s().agora()})

    @r.post("/simulador/executar/{mov_id}")
    def executar_no_campo(mov_id: str, corpo: ExecucaoIn | None = Body(default=None)):
        destino = corpo.piquete_id if corpo else None
        return executar(lambda: s().simulador_executar(mov_id, destino) or {"ok": True})

    # ---------- integração com o SeuGado ----------

    @integracao.get("/integracao/v1/execucoes")
    def execucoes(desde: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$")):
        return jsonable_encoder(s().execucoes(desde))

    app.include_router(r)
    app.include_router(integracao)
    return app


app = criar_app()
