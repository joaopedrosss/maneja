import type { PrevisaoClima, PrevisaoDia } from "./tipos";

export const CHUVA_FORTE_MM = 40;

export interface ResumoClima {
  chuva_total_mm: number;
  temp_min_c: number;
  temp_max_c: number;
  dias_chuva_forte: PrevisaoDia[];
}

export function resumoClima(clima: PrevisaoClima): ResumoClima {
  return {
    chuva_total_mm: clima.dias.reduce((s, d) => s + d.chuva_mm, 0),
    temp_min_c: Math.min(...clima.dias.map((d) => d.temp_min_c)),
    temp_max_c: Math.max(...clima.dias.map((d) => d.temp_max_c)),
    dias_chuva_forte: clima.dias.filter((d) => d.chuva_mm >= CHUVA_FORTE_MM),
  };
}
