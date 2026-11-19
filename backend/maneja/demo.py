"""Fazenda de demonstração: os mesmos dados de src/lib/demo.ts, mais as coleiras.

As datas são relativas a "hoje", para a demonstração funcionar em qualquer dia.
"""

from __future__ import annotations

from .datas import somar_dias
from .dominio import Coleira, Fazenda, LeituraNdvi, Lotacao, Movimentacao, Piquete, Rebanho
from .geo import area_ha, poligono_em_metros
from .repositorio import RepositorioMemoria

FAZENDA_ID = "faz-marcinho"
ORIGEM = (-9.6205, -35.9695)

# ids dos mesmos piquetes no SeuGado (usados pelo plano de exemplo em exemplos/plano-seugado.json)
EXTERNOS = {
    "pq-abobora": "0b6f2a7e-5c1d-4d8e-9a10-0000000000a1",
    "pq-jerimum": "0b6f2a7e-5c1d-4d8e-9a10-0000000000a2",
    "pq-macarrao": "0b6f2a7e-5c1d-4d8e-9a10-0000000000a3",
    "pq-feijao": "0b6f2a7e-5c1d-4d8e-9a10-0000000000a4",
    "pq-milho": "0b6f2a7e-5c1d-4d8e-9a10-0000000000a5",
}


def _piquete(pid: str, nome: str, vegetacao: str, pontos: list[tuple[float, float]]) -> Piquete:
    geometria = poligono_em_metros(ORIGEM, pontos)
    return Piquete(pid, FAZENDA_ID, nome, geometria, area_ha(geometria), vegetacao, EXTERNOS.get(pid))


def _serie(piquete_id: str, hoje: str, ultima_ha_dias: int, valores: list[float]) -> list[LeituraNdvi]:
    """Uma leitura por semana; valores da mais antiga para a mais recente."""
    n = len(valores)
    return [LeituraNdvi(piquete_id, somar_dias(hoje, -ultima_ha_dias - 7 * (n - 1 - i)), v) for i, v in enumerate(valores)]


def piquetes_demo() -> list[Piquete]:
    return [
        _piquete("pq-abobora", "Piquete Abóbora", "Marandu", [(-250, -10), (-150, 130), (-40, 95), (70, 20), (-15, -165)]),
        _piquete("pq-jerimum", "Piquete Jerimum", "Tifton 85", [(70, 20), (190, -55), (105, -240), (-15, -165)]),
        _piquete("pq-macarrao", "Piquete Macarrão", "Marandu", [(-130, 165), (-20, 390), (270, 225), (160, 0), (80, 45), (-35, 125)]),
        _piquete("pq-feijao", "Piquete Feijão", "Mombaça", [(190, -55), (400, -60), (380, -260), (105, -240)]),
        _piquete("pq-milho", "Piquete Milho", "Marandu", [(190, -55), (160, 0), (270, 225), (490, 150), (400, -60)]),
    ]


def coleiras_demo() -> list[Coleira]:
    """10 coleiras do lote piloto (Quadro de Custos): 6 no Abóbora e 4 no Milho."""
    abobora = [("boi", 3), ("vaca", 2), ("bezerro", 1)]
    milho = [("vaca", 3), ("bezerro", 1)]
    coleiras, n = [], 0
    for piquete_id, grupos in (("pq-abobora", abobora), ("pq-milho", milho)):
        for categoria, qtd in grupos:
            for _ in range(qtd):
                n += 1
                coleiras.append(Coleira(f"col-{n:02d}", categoria, piquete_id))
    return coleiras


def repositorio_demo(hoje: str) -> RepositorioMemoria:
    piquetes = piquetes_demo()
    nome = {p.id: p.nome for p in piquetes}
    ndvi = [
        *_serie("pq-abobora", hoje, 2, [0.66, 0.63, 0.6, 0.55, 0.49, 0.44, 0.37, 0.29]),  # degradando: precisa sair
        *_serie("pq-jerimum", hoje, 2, [0.7, 0.73, 0.76, 0.78, 0.8, 0.81, 0.83, 0.84]),  # passando do ponto, mas pequeno
        *_serie("pq-macarrao", hoje, 9, [0.33, 0.42, 0.5, 0.58, 0.63, 0.69, 0.73, 0.76]),  # melhor destino, leitura atrasada
        *_serie("pq-feijao", hoje, 2, [0.24, 0.28, 0.34, 0.4, 0.46, 0.52, 0.58, 0.63]),  # recuperando
        *_serie("pq-milho", hoje, 2, [0.58, 0.47, 0.34, 0.4, 0.47, 0.52, 0.54, 0.55]),
    ]
    lotacao = [
        Lotacao("pq-abobora", FAZENDA_ID, 12, 6, 5, somar_dias(hoje, -51)),
        Lotacao("pq-milho", FAZENDA_ID, 0, 18, 10, somar_dias(hoje, -58)),
    ]

    def passado(ha_dias, status, origem, destino, recomendado, rebanho, ndvi_origem, ndvi_destino, motivo):
        return Movimentacao(
            id=f"mov-demo-{ha_dias}", data=somar_dias(hoje, -ha_dias), rebanho=rebanho,
            piquete_origem_id=origem, piquete_origem_nome=nome[origem],
            piquete_destino_id=destino, piquete_destino_nome=nome[destino],
            ndvi_origem=ndvi_origem, ndvi_destino=ndvi_destino, motivo=motivo, confianca="alta",
            motivo_confianca="última leitura de NDVI há 2 dias no destino", status=status,
            destino_trocado=status == "trocada", destino_recomendado_nome=nome[recomendado], explicacao=motivo,
        )

    vacas = Rebanho(0, 18, 10)
    historico = [
        passado(37, "recusada", "pq-milho", "pq-macarrao", "pq-macarrao", vacas, 0.34, 0.58,
                "Piquete Milho estava com NDVI 0,34, abaixo de 0,35. Piquete Macarrão era o livre apto com NDVI mais alto."),
        passado(51, "aceita", "pq-feijao", "pq-abobora", "pq-abobora", Rebanho(12, 6, 5), 0.24, 0.66,
                "Piquete Feijão estava com NDVI 0,24, abaixo de 0,35. Piquete Abóbora era o livre apto com NDVI mais alto."),
        passado(58, "trocada", "pq-macarrao", "pq-milho", "pq-abobora", vacas, 0.33, 0.6,
                "Piquete Macarrão estava com NDVI 0,33, abaixo de 0,35. Piquete Abóbora era o livre apto com NDVI mais alto."),
    ]
    return RepositorioMemoria(
        fazenda=Fazenda(FAZENDA_ID, "Fazenda do Marcinho", "America/Maceio"),
        piquetes=piquetes, lotacao=lotacao, ndvi=ndvi, historico=historico, coleiras=coleiras_demo(),
    )
