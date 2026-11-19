"""Ponto de entrada da Vercel: o runtime Python carrega `app` deste arquivo.

Na Vercel a variável VERCEL existe, então a API sobe no modo sem estado (SPEC-013):
cada requisição carrega do PostgreSQL (Supabase) e grava de volta.
"""

from maneja.api import app

__all__ = ["app"]
