import type { GeoJsonPolygon } from "./tipos";

const RAIO_TERRA_M = 6_371_008.8;
const GRAU = Math.PI / 180;

// Área de um polígono pequeno (piquete) por projeção equiretangular local.
export function areaHa(geometria: GeoJsonPolygon): number {
  const anel = geometria.coordinates[0];
  if (!anel || anel.length < 3) return 0;
  const lat0 = (anel.reduce((s, c) => s + c[1], 0) / anel.length) * GRAU;
  const pontos = anel.map(([lng, lat]) => [
    lng * GRAU * RAIO_TERRA_M * Math.cos(lat0),
    lat * GRAU * RAIO_TERRA_M,
  ]);
  let dobro = 0;
  for (let i = 0; i < pontos.length; i++) {
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[(i + 1) % pontos.length];
    dobro += x1 * y2 - x2 * y1;
  }
  return Math.abs(dobro) / 2 / 10_000;
}

export function centro(geometria: GeoJsonPolygon): [number, number] {
  const anel = geometria.coordinates[0];
  // o GeoJSON repete o primeiro ponto no fim: não conte duas vezes
  const pontos = anel.length > 1 && anel[0][0] === anel.at(-1)![0] && anel[0][1] === anel.at(-1)![1]
    ? anel.slice(0, -1)
    : anel;
  const lat = pontos.reduce((s, c) => s + c[1], 0) / pontos.length;
  const lng = pontos.reduce((s, c) => s + c[0], 0) / pontos.length;
  return [lat, lng];
}

// Monta um polígono a partir de pontos em metros (x = leste, y = norte) em torno de uma origem.
export function poligonoEmMetros(origem: [number, number], pontos: [number, number][]): GeoJsonPolygon {
  const [lat0, lng0] = origem;
  const mPorGrauLat = RAIO_TERRA_M * GRAU;
  const mPorGrauLng = mPorGrauLat * Math.cos(lat0 * GRAU);
  const anel = pontos.map(([x, y]) => [
    +(lng0 + x / mPorGrauLng).toFixed(7),
    +(lat0 + y / mPorGrauLat).toFixed(7),
  ]);
  anel.push([...anel[0]]);
  return { type: "Polygon", coordinates: [anel] };
}
