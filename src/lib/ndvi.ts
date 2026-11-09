// Leituras de NDVI: consultas à série de cada piquete, confiança pela idade da
// leitura e a escala de cores do mapa.

import { diasEntre, haQuanto } from "./datas";
import type { Confianca, LeituraNdvi, Lote, Piquete, ResumoPiquete } from "./tipos";

const LEITURA_RECENTE_DIAS = 7;
const LEITURA_VELHA_DIAS = 14;

// NDVI de pasto raramente sai desta faixa: a escala do mapa satura nas pontas.
export const NDVI_ESCALA_MIN = 0.2;
export const NDVI_ESCALA_MAX = 0.8;

export function ultimaLeitura(ndvi: LeituraNdvi[], piqueteId: string, ate: string): LeituraNdvi | null {
  let melhor: LeituraNdvi | null = null;
  for (const l of ndvi) {
    if (l.piquete_id !== piqueteId || l.data > ate) continue;
    if (melhor === null || l.data >= melhor.data) melhor = l;
  }
  return melhor;
}

export function confiancaDaLeitura(leitura: LeituraNdvi | null, hoje: string): Confianca {
  if (leitura === null) return "baixa";
  const dias = diasEntre(leitura.data, hoje);
  if (dias <= LEITURA_RECENTE_DIAS) return "alta";
  if (dias <= LEITURA_VELHA_DIAS) return "media";
  return "baixa";
}

export function motivoConfianca(leitura: LeituraNdvi | null, hoje: string): string {
  return leitura === null ? "sem leitura de NDVI" : `última leitura de NDVI ${haQuanto(diasEntre(leitura.data, hoje))}`;
}

export function resumoPiquetes(piquetes: Piquete[], ndvi: LeituraNdvi[], lotes: Lote[], hoje: string): ResumoPiquete[] {
  return piquetes.map((p) => {
    const lote = lotes.find((l) => l.piquete_atual_id === p.id) ?? null;
    const leitura = ultimaLeitura(ndvi, p.id, hoje);
    return {
      piquete_id: p.id,
      nome: p.nome,
      vegetacao: p.vegetacao,
      area_ha: p.area_ha,
      situacao: lote ? "ocupado" : "descansando",
      lote_atual_nome: lote?.nome ?? null,
      ndvi: leitura?.valor ?? null,
      data_ndvi: leitura?.data ?? null,
      confianca: confiancaDaLeitura(leitura, hoje),
      motivo_confianca: motivoConfianca(leitura, hoje),
    };
  });
}

function canais(hex: string): number[] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

// Interpola entre as três cores da escala (hex #rrggbb): baixo → médio → alto.
export function corDoNdvi(valor: number, baixo: string, medio: string, alto: string): string {
  const t = Math.min(1, Math.max(0, (valor - NDVI_ESCALA_MIN) / (NDVI_ESCALA_MAX - NDVI_ESCALA_MIN)));
  const [de, para, f] = t < 0.5 ? [baixo, medio, t * 2] : [medio, alto, (t - 0.5) * 2];
  const a = canais(de);
  const b = canais(para);
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * f)).join(", ")})`;
}
