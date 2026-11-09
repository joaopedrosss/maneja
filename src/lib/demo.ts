// Dados de demonstração. Não há banco: tudo vive em memória e volta ao
// estado inicial quando a página é recarregada. As datas são relativas a "hoje"
// para que a demonstração funcione em qualquer dia.

import type { Base } from "./agente";
import { somarDias } from "./datas";
import { areaHa, poligonoEmMetros } from "./geo";
import type { Fazenda, GeoJsonPolygon, LeituraNdvi, Lote, Piquete, PrevisaoClima } from "./tipos";

export const USUARIO = { nome: "Técnico Maneja", email: "tecnico@maneja.app" };

const ORIGEM_MARCINHO: [number, number] = [-9.6205, -35.9695];
const ORIGEM_BOA_VISTA: [number, number] = [-9.6125, -35.9835];

function piquete(
  id: string,
  fazenda_id: string,
  nome: string,
  vegetacao: string,
  geometria: GeoJsonPolygon,
): Piquete {
  return { id, fazenda_id, nome, vegetacao, geometria, area_ha: areaHa(geometria) };
}

// Uma leitura por semana; `valores` vai da mais antiga para a mais recente.
function serie(piquete_id: string, hoje: string, ultimaHaDias: number, valores: number[]): LeituraNdvi[] {
  return valores.map((valor, i) => ({
    piquete_id,
    data: somarDias(hoje, -ultimaHaDias - 7 * (valores.length - 1 - i)),
    valor,
  }));
}

export function baseInicial(hoje: string): Base {
  const fazendas: Fazenda[] = [
    {
      id: "faz-marcinho",
      cliente_nome: "Cliente Marcinho",
      nome: "Fazenda do Marcinho",
      timezone: "America/Maceio",
    },
    {
      id: "faz-boa-vista",
      cliente_nome: "Cliente Ana Lúcia",
      nome: "Sítio Boa Vista",
      timezone: "America/Maceio",
    },
  ];

  const piquetes: Piquete[] = [
    piquete("pq-abobora", "faz-marcinho", "Piquete Abóbora", "Marandu",
      poligonoEmMetros(ORIGEM_MARCINHO, [[-250, -10], [-150, 130], [-40, 95], [70, 20], [-15, -165]])),
    piquete("pq-jerimum", "faz-marcinho", "Piquete Jerimum", "Marandu",
      poligonoEmMetros(ORIGEM_MARCINHO, [[70, 20], [190, -55], [105, -240], [-15, -165]])),
    piquete("pq-macarrao", "faz-marcinho", "Piquete Macarrão", "Marandu",
      poligonoEmMetros(ORIGEM_MARCINHO, [[-130, 165], [-20, 390], [270, 225], [160, 0], [80, 45], [-35, 125]])),

    piquete("pq-baixa", "faz-boa-vista", "Piquete da Baixa", "Mombaça",
      poligonoEmMetros(ORIGEM_BOA_VISTA, [[-200, -120], [-200, 110], [0, 110], [0, -120]])),
    piquete("pq-alto", "faz-boa-vista", "Piquete do Alto", "Mombaça",
      poligonoEmMetros(ORIGEM_BOA_VISTA, [[0, -120], [0, 110], [190, 130], [210, -110]])),
    piquete("pq-acude", "faz-boa-vista", "Piquete do Açude", "Tifton 85",
      poligonoEmMetros(ORIGEM_BOA_VISTA, [[-200, 110], [-160, 260], [60, 250], [0, 110]])),
  ];

  const lotes: Lote[] = [
    { id: "lote-recria", fazenda_id: "faz-marcinho", nome: "Lote Recria", n_animais: 28, peso_medio_kg: 350,
      piquete_atual_id: "pq-abobora", desde: somarDias(hoje, -6) },
    { id: "lote-vacas", fazenda_id: "faz-boa-vista", nome: "Lote Vacas", n_animais: 30, peso_medio_kg: 450,
      piquete_atual_id: "pq-baixa", desde: somarDias(hoje, -4) },
  ];

  const ndvi: LeituraNdvi[] = [
    ...serie("pq-abobora", hoje, 2, [0.66, 0.63, 0.6, 0.55, 0.49, 0.44, 0.37, 0.29]),
    ...serie("pq-jerimum", hoje, 2, [0.7, 0.73, 0.76, 0.78, 0.8, 0.81, 0.83, 0.84]),
    ...serie("pq-macarrao", hoje, 9, [0.68, 0.7, 0.71, 0.73, 0.72, 0.74, 0.75, 0.76]),
    ...serie("pq-baixa", hoje, 2, [0.6, 0.58, 0.55, 0.52, 0.5, 0.47, 0.45, 0.42]),
    ...serie("pq-alto", hoje, 2, [0.4, 0.44, 0.48, 0.52, 0.56, 0.6, 0.63, 0.66]),
  ];

  const chuvas = [0, 2, 48, 12, 0, 0, 5];
  const minimas = [22, 22, 21, 21, 22, 23, 23];
  const maximas = [31, 30, 26, 27, 30, 32, 31];
  const clima: PrevisaoClima = {
    fazenda_id: "faz-marcinho",
    dias: chuvas.map((chuva_mm, i) => ({
      data: somarDias(hoje, i),
      chuva_mm,
      temp_min_c: minimas[i],
      temp_max_c: maximas[i],
    })),
  };

  return { fazendas, piquetes, lotes, ndvi, clima };
}
