"""Autenticação (SPEC-009): senha com PBKDF2 e token JWT HS256, sem dependência externa.

Critério de qualidade 4.2: nenhuma rota de dados responde sem token válido;
token expirado devolve 401.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

ITERACOES = 200_000
VALIDADE = timedelta(hours=8)


class TokenInvalido(Exception):
    """Token ausente, malformado, com assinatura errada ou expirado."""


# ---------- senha ----------

def hash_senha(senha: str, sal: bytes | None = None, iteracoes: int = ITERACOES) -> str:
    """Formato: pbkdf2_sha256$<iterações>$<sal hex>$<hash hex>."""
    sal = sal or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", senha.encode(), sal, iteracoes)
    return f"pbkdf2_sha256${iteracoes}${sal.hex()}${digest.hex()}"


def verificar_senha(senha: str, guardado: str) -> bool:
    try:
        algoritmo, iteracoes, sal, esperado = guardado.split("$")
    except ValueError:
        return False
    if algoritmo != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", senha.encode(), bytes.fromhex(sal), int(iteracoes))
    return hmac.compare_digest(digest.hex(), esperado)


# ---------- token JWT (HS256) ----------

def _b64(dados: bytes) -> str:
    return base64.urlsafe_b64encode(dados).rstrip(b"=").decode()


def _de_b64(texto: str) -> bytes:
    return base64.urlsafe_b64decode(texto + "=" * (-len(texto) % 4))


def emitir_token(email: str, segredo: str, agora: datetime, validade: timedelta = VALIDADE) -> tuple[str, datetime]:
    expira = agora + validade
    cabecalho = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    carga = _b64(json.dumps({"sub": email, "iat": int(agora.timestamp()), "exp": int(expira.timestamp())},
                            separators=(",", ":")).encode())
    assinatura = hmac.new(segredo.encode(), f"{cabecalho}.{carga}".encode(), hashlib.sha256).digest()
    return f"{cabecalho}.{carga}.{_b64(assinatura)}", expira


def validar_token(token: str, segredo: str, agora: datetime) -> str:
    """Devolve o e-mail do token ou lança TokenInvalido."""
    try:
        cabecalho, carga, assinatura = token.split(".")
        esperada = hmac.new(segredo.encode(), f"{cabecalho}.{carga}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_de_b64(assinatura), esperada):
            raise TokenInvalido("assinatura inválida")
        if json.loads(_de_b64(cabecalho)).get("alg") != "HS256":
            raise TokenInvalido("algoritmo inválido")
        dados = json.loads(_de_b64(carga))
    except (ValueError, json.JSONDecodeError) as e:
        raise TokenInvalido("token malformado") from e
    if int(dados.get("exp", 0)) <= int(agora.timestamp()):
        raise TokenInvalido("token expirado")
    return str(dados["sub"])


@dataclass
class ConfigAuth:
    email: str
    senha_hash: str
    segredo: str
    token_integracao: str = ""  # token fixo para o SeuGado consultar /integracao/v1/*
