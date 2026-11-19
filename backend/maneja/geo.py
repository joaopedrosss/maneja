"""Geometria de piquetes pequenos: polígonos GeoJSON em [lon, lat]."""

import math
import random

RAIO_TERRA_M = 6_371_008.8
GRAU = math.pi / 180


def anel(geometria: dict) -> list[list[float]]:
    pontos = geometria["coordinates"][0]
    if len(pontos) > 1 and pontos[0] == pontos[-1]:
        return pontos[:-1]
    return pontos


def poligono_valido(geometria: dict) -> bool:
    try:
        pontos = anel(geometria)
    except (KeyError, IndexError, TypeError):
        return False
    return len({(p[0], p[1]) for p in pontos}) >= 3 and area_ha(geometria) > 0


def area_ha(geometria: dict) -> float:
    pontos = anel(geometria)
    if len(pontos) < 3:
        return 0.0
    lat0 = sum(p[1] for p in pontos) / len(pontos) * GRAU
    xy = [(p[0] * GRAU * RAIO_TERRA_M * math.cos(lat0), p[1] * GRAU * RAIO_TERRA_M) for p in pontos]
    dobro = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(xy, xy[1:] + xy[:1]))
    return abs(dobro) / 2 / 10_000


def contem(geometria: dict, lat: float, lon: float) -> bool:
    """Ponto no polígono por lançamento de raio."""
    pontos = anel(geometria)
    dentro = False
    j = len(pontos) - 1
    for i in range(len(pontos)):
        xi, yi = pontos[i]
        xj, yj = pontos[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            dentro = not dentro
        j = i
    return dentro


def centro(geometria: dict) -> tuple[float, float]:
    pontos = anel(geometria)
    return sum(p[1] for p in pontos) / len(pontos), sum(p[0] for p in pontos) / len(pontos)


def ponto_aleatorio(geometria: dict, rng: random.Random) -> tuple[float, float]:
    """(lat, lon) uniforme dentro do polígono, por rejeição na caixa envolvente."""
    pontos = anel(geometria)
    lons = [p[0] for p in pontos]
    lats = [p[1] for p in pontos]
    for _ in range(10_000):
        lat = rng.uniform(min(lats), max(lats))
        lon = rng.uniform(min(lons), max(lons))
        if contem(geometria, lat, lon):
            return lat, lon
    return centro(geometria)


def poligono_em_metros(origem: tuple[float, float], pontos: list[tuple[float, float]]) -> dict:
    """Polígono a partir de pontos em metros (x = leste, y = norte) em torno de (lat, lon)."""
    lat0, lon0 = origem
    m_por_grau_lat = RAIO_TERRA_M * GRAU
    m_por_grau_lon = m_por_grau_lat * math.cos(lat0 * GRAU)
    coords = [[round(lon0 + x / m_por_grau_lon, 7), round(lat0 + y / m_por_grau_lat, 7)] for x, y in pontos]
    coords.append(list(coords[0]))
    return {"type": "Polygon", "coordinates": [coords]}
